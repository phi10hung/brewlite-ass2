# E2E test

Test end-to-end bằng Playwright: mở trình duyệt thật, đi hết luồng chính từ menu đến xác nhận đơn (đề mục 7.2, NFR-13).

| Mã | Luồng |
| --- | --- |
| E2E-T01 | Xem menu → chọn món (size L, 2 ly) → giỏ hàng → chưa đăng nhập thì sang đăng nhập → Checkout chọn Thẻ → VNPay giả lập trả thành công → trang kết quả hiện mã đơn, giỏ trống → chi tiết đơn "Đã thanh toán", điểm thưởng đúng BR-08 → lịch sử đơn có đơn vừa đặt |
| E2E-T02 | Đăng nhập → đặt món → VNPay giả lập trả hủy → báo thất bại, giỏ vẫn còn → mở đơn thấy đếm ngược → Thanh toán tiếp → thành công, giỏ trống |

Mỗi test chạy trên 3 trình duyệt: Chromium (khổ Pixel 7), WebKit (khổ iPhone 13, như Safari), Firefox (máy tính).

## Cách hoạt động

Lệnh `npm test` tự chạy 3 chương trình rồi mới mở trình duyệt:

| Chương trình | Cổng | Ghi chú |
| --- | --- | --- |
| VNPay giả lập (`fake-vnpay.mjs`) | 4900 | Thay VNPay Sandbox (ADR 005): kiểm tra chữ ký, có nút "Thanh toán thành công" và "Hủy thanh toán", trả lời lệnh truy vấn lại và hoàn tiền. Test không cần mạng, không cần khóa VNPay thật |
| API (`apps/api`) | 4100 | Chạy migration, seed vào database E2E, build rồi chạy. Code thanh toán chạy y như thật, chỉ địa chỉ VNPay trỏ tới bản giả lập |
| Web (`apps/web`) | 3100 | Build với `NEXT_PUBLIC_API_URL=http://localhost:4100` rồi chạy |

Cổng riêng nên không đụng bản đang chạy bằng Docker Compose (3000, 4000).

## Chạy ở máy cá nhân

Cần: Node.js 24, Docker Desktop.

1. Bật database của Docker Compose (ở thư mục gốc repo):
   ```powershell
   docker compose up -d db
   ```
2. Cài thư viện, trình duyệt (lần đầu):
   ```powershell
   cd apps/api; npm install; cd ../web; npm install
   cd ../../tests/e2e; npm install
   npx playwright install chromium webkit firefox
   ```
3. Chạy test (trong `tests/e2e`):
   ```powershell
   $env:E2E_DATABASE_URL="postgresql://brewlite:brewlite@localhost:5432/brewlite_e2e"; npm test
   ```
   `E2E_DATABASE_URL` là database riêng cho E2E, **tên phải kết thúc bằng `_e2e`** (không dùng database đang chạy của Docker Compose). Lần đầu chưa có thì Prisma tự tạo. Tài khoản, mật khẩu lấy theo `POSTGRES_USER`, `POSTGRES_PASSWORD` trong `.env`.

Mất khoảng 2 đến 3 phút (phần lớn là build API và web). Đạt thì cuối cùng in `6 passed`.

Lệnh khác:
- `npm run test:headed`: chỉ chạy trên Chromium, hiện cửa sổ trình duyệt để xem từng bước
- `npm run report`: mở báo cáo của lần chạy gần nhất (có ảnh chụp, trace của test lỗi)

Lưu ý:
- Tắt `npm run dev` của web trước khi chạy, vì lệnh test build lại thư mục `apps/web/.next`.
- Cổng 3100, 4100, 4900 phải trống.

## Trong CI

Job "E2E test (tests/e2e)" trong `.github/workflows/ci.yml` chạy trên mọi pull request với database PostgreSQL trống. Test lỗi thì báo cáo Playwright được lưu ở mục Artifacts của lần chạy (7 ngày).