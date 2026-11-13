# BrewLite Web

Web Next.js của BrewLite, viết theo hướng mobile-first. Kiến trúc và lý do chọn: `docs/architecture/adr/002-frontend-nextjs-pwa.md`.

## Lệnh thường dùng

Chạy trong thư mục `apps/web`:

| Lệnh | Việc |
| --- | --- |
| `npm install` | Cài thư viện |
| `npm run dev` | Chạy web ở chế độ lập trình tại http://localhost:3000 |
| `npm run lint` | Kiểm tra code |
| `npm test` | Chạy test component (Vitest + React Testing Library) |
| `npm run build` | Build bản chạy thật |
| `npm start` | Chạy bản đã build tại http://localhost:3000 (dùng để thử PWA) |

Web gọi API tại `NEXT_PUBLIC_API_URL`; chưa khai báo thì dùng http://localhost:4000 (API chạy ở máy cá nhân). Muốn đổi thì tạo tệp `apps/web/.env.local` có dòng `NEXT_PUBLIC_API_URL=...`.

## Giỏ hàng và thanh toán

- `/cart`: giỏ lưu ở trình duyệt (`src/store/cart-store.ts`). Mỗi lần giỏ thay đổi, web gọi `POST /products/availability` cho từng dòng; dòng vượt số ly còn pha được thì báo đỏ "Chỉ còn pha được X ly", khóa nút + và nút **Tiến hành thanh toán**.
- `/checkout`: chưa đăng nhập thì chuyển tới trang đăng nhập rồi quay lại; giỏ trống thì về `/cart`. Xem lại món, áp mã giảm giá (`POST /promotions/validate`), chọn Ví hoặc Thẻ. Bấm **Thanh toán**: `POST /orders` → `POST /payments` (kèm `Idempotency-Key`) → chuyển sang VNPay Sandbox.
- Giỏ chỉ bị xóa khi server xác nhận thanh toán thành công; tạo đơn lỗi thì ở lại Checkout, giữ giỏ.
- Mã giảm giá có sẵn trong dữ liệu mẫu: `GIAM10` (giảm 10%, đơn từ 50.000đ), `GIAM20K` (giảm 20.000đ, đơn từ 100.000đ); `HETHAN`, `NGUNG` để thử báo lỗi.

## PWA

- `src/app/manifest.ts`: tên, màu, biểu tượng 192 px và 512 px (`public/icons/`), mở dạng `standalone`. Trình duyệt hỗ trợ (Chrome, Edge, Safari trên iPhone) cho phép cài lên màn hình chính.
- `public/sw.js`: service worker lưu tạm trang đã mở, tệp giao diện và dữ liệu menu (`GET /products`) để mở lại khi mất mạng; khi đó hiện thông báo "Bạn đang ngoại tuyến".
- Service worker chỉ bật ở bản build (`npm run build` rồi `npm start`, hoặc trên Vercel), không bật khi `npm run dev`.
- Đã thử bản build trên máy, quay lại `npm run dev` mà thấy trang cũ: DevTools (F12) → **Application** → **Storage** → **Clear site data**, rồi tải lại trang.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/app` | Các trang (App Router), layout chung, manifest, biểu tượng |
| `src/components` | Component dùng chung: `Navbar`, `Footer`, `OfflineBanner`, `ServiceWorkerRegister` |
| `src/lib/checkout.ts` | Hàm gọi API của giỏ hàng và Checkout: số ly còn pha được, mã giảm giá, tạo đơn, tạo giao dịch |
| `src/lib/api.ts` | Hàm `apiFetch` gọi API, báo lỗi bằng tiếng Việt |
| `public` | Biểu tượng PWA, service worker `sw.js` |

Test đặt cạnh tệp được test, tên `*.test.tsx` hoặc `*.test.ts`, mã test `CT-xx` (SRS mục 6).