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

- `/products/:id`: "Còn X ly" tính cho đúng size, topping đang chọn; mỗi lần đổi lựa chọn, web gọi `POST /products/availability` (`src/lib/products.ts`), số lượng chọn tối đa bằng X; lựa chọn không đủ nguyên liệu thì báo và khóa nút **Thêm vào giỏ**.
- `/cart`: giỏ lưu ở trình duyệt (`src/store/cart-store.ts`). Mỗi lần giỏ thay đổi, web gọi `POST /products/availability` cho từng dòng; dòng vượt số ly còn pha được thì báo đỏ "Chỉ còn pha được X ly", khóa nút + và nút **Tiến hành thanh toán**.
- `/checkout`: chưa đăng nhập thì chuyển tới trang đăng nhập rồi quay lại; giỏ trống thì về `/cart`. Xem lại món, áp mã giảm giá (`POST /promotions/validate`), chọn Ví hoặc Thẻ. Bấm **Thanh toán**: `POST /orders` → `POST /payments` (kèm `Idempotency-Key`) → chuyển sang VNPay Sandbox.
- Giỏ chỉ bị xóa khi server xác nhận thanh toán thành công; tạo đơn lỗi thì ở lại Checkout, giữ giỏ.
- Mã giảm giá có sẵn trong dữ liệu mẫu: `GIAM10` (giảm 10%, đơn từ 50.000đ), `GIAM20K` (giảm 20.000đ, đơn từ 100.000đ); `HETHAN`, `NGUNG` để thử báo lỗi.

## PWA

- `src/app/manifest.ts`: tên, màu, biểu tượng 192 px và 512 px (`public/icons/`), mở dạng `standalone`. Trình duyệt hỗ trợ (Chrome, Edge, Safari trên iPhone) cho phép cài lên màn hình chính.
- `public/sw.js`: service worker lưu tạm trang đã mở, tệp giao diện và dữ liệu menu (`GET /products`) để mở lại khi mất mạng; khi đó hiện thông báo "Bạn đang ngoại tuyến".
- Service worker chỉ bật ở bản build (`npm run build` rồi `npm start`, hoặc trên Vercel), không bật khi `npm run dev`.
- Đã thử bản build trên máy, quay lại `npm run dev` mà thấy trang cũ: DevTools (F12) → **Application** → **Storage** → **Clear site data**, rồi tải lại trang.

## Trang nhân viên

Đăng nhập bằng tài khoản Nhân viên (`staff@brewlite.vn`, mật khẩu `123456`) thì thanh điều hướng có mục **Quầy**. Chưa đăng nhập mà mở `/staff` thì được chuyển tới trang đăng nhập; tài khoản Khách hàng thì thấy "Chỉ nhân viên được truy cập".

| Trang | Việc |
| --- | --- |
| `/staff` | Đơn hàng theo trạng thái (mặc định "Đã thanh toán"); nút Nhận đơn → Pha xong → Giao khách; hủy đơn đã thanh toán (hỏi xác nhận trước). Đơn vừa bị người khác đổi trạng thái thì báo lỗi và tải lại danh sách |
| `/staff/revenue` | Doanh thu hôm nay, tổng cộng và từng giao dịch; số liệu do API tính theo BR-14 |
| `/staff/ingredients` | Tồn kho từng nguyên liệu, nhãn "Sắp hết"; nhập thêm số nguyên từ 1 đến 1.000.000 |

## Đơn hàng của khách

| Trang | Việc |
| --- | --- |
| `/payment/result` | VNPay chuyển khách về đây (`VNP_RETURN_URL`). Web gửi nguyên tham số cho `GET /payments/vnpay-return` để server xác minh: thành công thì hiện mã đơn, xóa giỏ, cập nhật điểm, 3 giây sau mở chi tiết đơn; thất bại thì báo lý do, giữ giỏ |
| `/orders` | Lịch sử đơn (`GET /orders/me`), cần đăng nhập |
| `/orders/:id` | Chi tiết đơn: từng món, giảm giá, tổng tiền, tình trạng hoàn tiền; đơn chờ thanh toán có đồng hồ đếm ngược, nút Thanh toán tiếp và Hủy đơn; đơn đã thanh toán hủy được và được hoàn tiền |

Tài khoản Khách hàng thấy mục **Đơn hàng** trên thanh điều hướng, kèm số điểm thưởng lấy mới từ `GET /auth/me` khi tải trang, sau khi thanh toán thành công và sau khi hủy đơn.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/app` | Các trang (App Router), layout chung, manifest, biểu tượng |
| `src/components` | Component dùng chung: `Navbar`, `Footer`, `OfflineBanner`, `ServiceWorkerRegister` |
| `src/lib/checkout.ts` | Hàm gọi API của giỏ hàng và Checkout: số ly còn pha được, mã giảm giá, tạo đơn, tạo giao dịch |
| `src/lib/api.ts` | Hàm `apiFetch` gọi API, báo lỗi bằng tiếng Việt |
| `src/lib/order-status.ts` | Tên tiếng Việt của trạng thái đơn (trùng với API), bước tiếp theo ở quầy, tình trạng hoàn tiền |
| `src/lib/staff.ts` | Hàm gọi API của Nhân viên: đơn hàng, đổi trạng thái, doanh thu, kho, nhập kho |
| `src/lib/orders.ts` | Hàm gọi API đơn hàng của Khách hàng: lịch sử, chi tiết, hủy đơn, thanh toán tiếp, xác minh kết quả VNPay, cập nhật điểm thưởng |
| `public` | Biểu tượng PWA, service worker `sw.js` |

Test đặt cạnh tệp được test, tên `*.test.tsx` hoặc `*.test.ts`, mã test `CT-xx` (SRS mục 6).