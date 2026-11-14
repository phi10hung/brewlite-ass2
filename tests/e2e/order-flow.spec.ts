import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

// Luồng chính của BrewLite trên trình duyệt thật (đề mục 7.2, NFR-13; Activity-01, Sequence-01):
// xem menu → chọn món → giỏ hàng → đăng nhập → đặt đơn → thanh toán (VNPay giả lập) → xác nhận đơn.

const API_URL = 'http://localhost:4100';
const PASSWORD = 'matkhau123';

// Mỗi test một tài khoản Khách hàng mới (điểm thưởng bắt đầu từ 0, chưa có đơn chờ),
// để các trình duyệt chạy lần lượt trên cùng database không ảnh hưởng nhau
async function newCustomer(request: APIRequestContext) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@brewlite.vn`;
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name: 'Khách E2E', email, password: PASSWORD },
  });
  expect(response.ok()).toBe(true);
  return email;
}

// "78.000đ" → 78000
const money = (text: string) => Number(text.replace(/\D/g, ''));

// Từ menu mở món, chọn size L, 2 ly, thêm vào giỏ
async function addToCart(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Thực đơn' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Cà phê sữa đá' }).click();

  await expect(
    page.getByRole('heading', { name: 'Cà phê sữa đá' }),
  ).toBeVisible();
  await page.getByText('Size L').click();
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ' }).click();
  await expect(
    page.getByRole('link', { name: 'Giỏ hàng, 2 ly' }),
  ).toBeVisible();
}

// Ở trang đăng nhập: chờ trang tải xong mới nhập (nhập sớm thì chữ bị xóa khi web vừa chạy), rồi đăng nhập
async function login(page: Page, email: string) {
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

// Ở Checkout chọn Thẻ, bấm Thanh toán; trả về tổng tiền hiện trên nút
async function payByCard(page: Page) {
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole('radio', { name: /^Thẻ/ }).check();
  const payButton = page.getByRole('button', { name: /^Thanh toán \d/ });
  const total = money((await payButton.textContent()) ?? '');
  await payButton.click();
  return total;
}

test('E2E-T01: xem menu, chọn món, giỏ hàng, đăng nhập, đặt đơn, thanh toán thành công, xác nhận đơn và điểm thưởng', async ({
  page,
  request,
}) => {
  const email = await newCustomer(request);

  await addToCart(page);

  // Giỏ hàng: đúng món, size, số ly; chưa đăng nhập thì Checkout chuyển tới đăng nhập
  await page.getByRole('link', { name: 'Giỏ hàng, 2 ly' }).click();
  await expect(page.getByText('Cà phê sữa đá')).toBeVisible();
  await expect(page.getByText(/Size L/)).toBeVisible();
  await page.getByRole('link', { name: 'Tiến hành thanh toán' }).click();

  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
  await login(page, email);

  // Đăng nhập xong quay lại Checkout, đặt đơn và sang VNPay
  const total = await payByCard(page);
  await expect(
    page.getByRole('heading', { name: 'VNPay giả lập' }),
  ).toBeVisible();
  await expect(
    page.getByText(`${total.toLocaleString('vi-VN')}đ`),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Thanh toán thành công' }).click();

  // Trang kết quả: server xác minh, hiện mã đơn, xóa giỏ
  await expect(
    page.getByRole('status').filter({ hasText: 'Thanh toán thành công' }),
  ).toBeVisible();
  const code =
    (await page.locator('strong').filter({ hasText: /^BL-/ }).textContent()) ??
    '';
  expect(code).toMatch(/^BL-[A-Z0-9]{6}$/);
  await expect(
    page.getByRole('link', { name: 'Giỏ hàng, 0 ly' }),
  ).toBeVisible();

  // 3 giây sau tự mở chi tiết đơn: đã thanh toán, điểm thưởng = phần nguyên của tổng ÷ 10.000 (BR-08)
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(
    page.getByRole('heading', { name: `Đơn ${code}` }),
  ).toBeVisible();
  await expect(page.getByText('Đã thanh toán')).toBeVisible();
  await expect(
    page.getByText(`${Math.floor(total / 10000)} điểm`),
  ).toBeVisible();

  // Lịch sử đơn có đơn vừa đặt
  await page.getByRole('link', { name: /Đơn hàng/ }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByText(code)).toBeVisible();
});

test('E2E-T02: thanh toán thất bại thì giữ giỏ, mở đơn thanh toán tiếp và thành công', async ({
  page,
  request,
}) => {
  const email = await newCustomer(request);

  // Đăng nhập trước, rồi đặt món
  await page.goto('/login');
  await login(page, email);
  await expect(page.getByRole('link', { name: /Đơn hàng/ })).toBeVisible();

  await addToCart(page);
  await page.getByRole('link', { name: 'Giỏ hàng, 2 ly' }).click();
  await page.getByRole('link', { name: 'Tiến hành thanh toán' }).click();
  await payByCard(page);

  // Khách hủy trên VNPay: báo thất bại, giỏ vẫn còn (FR-16)
  await page.getByRole('link', { name: 'Hủy thanh toán' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Thanh toán không thành công' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Giỏ hàng, 2 ly' }),
  ).toBeVisible();

  // Mở đơn: thất bại, còn hạn thì đếm ngược, thanh toán tiếp
  await page.getByRole('link', { name: 'Mở đơn để thanh toán lại' }).click();
  await expect(page.getByText('Thanh toán thất bại')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(
    /Còn \d{2}:\d{2} để thanh toán/,
  );
  await page.getByRole('button', { name: 'Thanh toán tiếp' }).click();

  await expect(
    page.getByRole('heading', { name: 'VNPay giả lập' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Thanh toán thành công' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Thanh toán thành công' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Giỏ hàng, 0 ly' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(page.getByText('Đã thanh toán')).toBeVisible();
});