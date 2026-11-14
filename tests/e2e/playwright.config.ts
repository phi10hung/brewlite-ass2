import { defineConfig, devices } from '@playwright/test';

// E2E test của BrewLite (đề mục 7.2, NFR-13): Playwright tự chạy VNPay giả lập, API và web,
// rồi mở trình duyệt đi hết luồng từ menu đến xác nhận đơn.
// Cổng riêng (web 3100, API 4100, VNPay giả lập 4900) để không đụng bản đang chạy bằng Docker Compose.

// Database riêng cho E2E: API chạy migration và seed vào đây trước khi test
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Thiếu E2E_DATABASE_URL: địa chỉ database riêng cho E2E (xem tests/e2e/README.md)',
  );
}
const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!databaseName.endsWith('_e2e')) {
  throw new Error(
    `Database "${databaseName}" không phải database E2E: tên phải kết thúc bằng _e2e`,
  );
}

const WEB_URL = 'http://localhost:3100';
const API_URL = 'http://localhost:4100';
const VNPAY_URL = 'http://localhost:4900';

// Khóa giả, chỉ VNPay giả lập và API dùng trong lúc test; không phải khóa VNPay thật
const VNPAY_KEYS = {
  VNP_TMN_CODE: 'E2ETEST',
  VNP_HASH_SECRET: 'khoa-gia-lap-e2e',
};

export default defineConfig({
  testDir: '.',
  // Các trình duyệt chạy lần lượt trên cùng một API, database
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // NFR-13: Chrome, Safari trên điện thoại (mobile-first, NFR-10) và Firefox trên máy tính
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      command: 'node fake-vnpay.mjs',
      url: `${VNPAY_URL}/health`,
      env: { ...VNPAY_KEYS, FAKE_VNPAY_PORT: '4900' },
    },
    {
      // Tạo bảng, nạp dữ liệu mẫu, build rồi chạy API
      command: 'npm run db:setup && npm run build && npm run start:prod',
      cwd: '../../apps/api',
      url: `${API_URL}/health`,
      timeout: 180_000,
      env: {
        ...VNPAY_KEYS,
        DATABASE_URL: databaseUrl,
        PORT: '4100',
        JWT_SECRET: 'khoa-jwt-e2e',
        CORS_ORIGIN: WEB_URL,
        ORDER_PAYMENT_MINUTES: '5',
        VNP_PAY_URL: `${VNPAY_URL}/paymentv2/vpcpay.html`,
        VNP_API_URL: `${VNPAY_URL}/merchant_webapi/api/transaction`,
        VNP_RETURN_URL: `${WEB_URL}/payment/result`,
      },
    },
    {
      // Địa chỉ API được ghi vào bản build của web
      command: 'npm run build && npm run start -- -p 3100',
      cwd: '../../apps/web',
      url: WEB_URL,
      timeout: 300_000,
      env: { NEXT_PUBLIC_API_URL: API_URL },
    },
  ],
});