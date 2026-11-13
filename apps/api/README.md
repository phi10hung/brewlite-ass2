# BrewLite API

API NestJS của BrewLite. Kiến trúc và lý do chọn: `docs/architecture/adr/003-backend-nestjs-postgresql.md`.

## Lệnh thường dùng

Chạy trong thư mục `apps/api`:

| Lệnh | Việc |
| --- | --- |
| `npm install` | Cài thư viện, tự sinh Prisma Client |
| `npm run start:dev` | Chạy API ở chế độ lập trình (tự tải lại khi sửa code) |
| `npm run lint` | Kiểm tra code |
| `npm test` | Chạy unit test |
| `npm run test:integration` | Chạy integration test với database test riêng (xem mục Integration test) |
| `npm run build` | Build ra thư mục `dist` |
| `npx prisma migrate dev --name <tên>` | Tạo migration mới sau khi sửa `prisma/schema.prisma` |
| `npm run db:deploy` | Áp dụng các migration chưa chạy vào database |
| `npm run db:seed` | Nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi) |
| `npm run db:setup` | Chạy cả hai lệnh trên: database trống có đủ bảng và dữ liệu mẫu |

API đọc biến môi trường từ tệp `.env` ở gốc repo (chép từ `.env.example`). Thiếu `DATABASE_URL` hoặc `JWT_SECRET` thì API dừng ngay lúc khởi động và báo tên biến bị thiếu. Khi chạy bằng Docker, container tự chạy migration rồi nạp dữ liệu mẫu trước khi bật API (`docker-start.sh`).

## API

| Phương thức, đường dẫn | Đăng nhập | Việc |
| --- | --- | --- |
| `GET /health` | Không | Kiểm tra API và database: 200 khi hoạt động, 503 khi database không trả lời |
| `GET /products` | Không | Danh sách món; `?category=Cà phê` lọc theo danh mục. `stock` là số ly size S không topping còn pha được, `0` là "Hết món" |
| `GET /products/:id` | Không | Chi tiết món kèm size S/M/L (`extra` là phụ thu), topping (`available` = còn đủ nguyên liệu) và `stock`. Không có món: 404 "Không tìm thấy món"; mã không phải số: 400 "Mã món không hợp lệ" |
| `POST /auth/register` | Không | Đăng ký tài khoản Khách hàng `{ name, email, password }`: 201 kèm `accessToken` và `user` (`id`, `name`, `email`, `role`, `loyaltyPoints`). Dữ liệu sai: 400; email đã có (không phân biệt hoa, thường): 409 "Email đã được đăng ký" |
| `POST /auth/login` | Không | Đăng nhập `{ email, password }`: 200 kèm `accessToken` và `user`. Sai email hoặc mật khẩu: 401 "Email hoặc mật khẩu không đúng" |
| `GET /auth/me` | Có | Tài khoản đang đăng nhập kèm điểm thưởng |
| `POST /products/availability` | Không | Số ly tối đa của một dòng giỏ `{ items: [các dòng khác kèm quantity], line: { productId, size, toppingIds } }`: 200 `{ maxQuantity }`, đã trừ nguyên liệu của các dòng khác (FR-05) |
| `POST /orders` | Có | Tạo đơn `{ items: [{ productId, size, toppingIds, quantity }], paymentMethod: WALLET \| CARD, promotionCode? }`: 201 `{ orderId, code, total, expiresAt }`. Server tự tính giá; đơn `PENDING`, hạn thanh toán `ORDER_PAYMENT_MINUTES` phút; đơn chờ cũ của khách bị hủy và trả kho. Thiếu nguyên liệu: 400 "Món … không đủ nguyên liệu, chỉ còn pha được N ly"; tranh kho thử lại 10 lần vẫn lỗi: 409 "Hệ thống đang bận, vui lòng đặt lại sau giây lát" |
| `GET /orders/me` | Có | Đơn của mình, mới nhất trước |
| `GET /orders/:id` | Có | Chi tiết đơn của mình. Mã không phải số: 400 "Mã đơn không hợp lệ"; không có hoặc của người khác: 404 "Không tìm thấy đơn hàng" |
| `PATCH /orders/:id/cancel` | Có | Khách hủy đơn `PENDING`, `PAYMENT_FAILED`, `PAID`; trả lại nguyên liệu. Trạng thái khác: 400; đơn vừa đổi trạng thái: 409 |
| `GET /staff/orders?status=` | Nhân viên | Đơn theo trạng thái (đến trước hiện trước), kèm `customerName` |
| `POST /payments` | Có | Tạo giao dịch VNPay cho đơn của mình: header `Idempotency-Key`, body `{ orderId, method: WALLET \| CARD }`: 201 `{ txnRef, payUrl }`. Cùng khóa gửi lại: trả lại giao dịch cũ; khóa đã dùng cho đơn hoặc phương thức khác: 409. Thiếu khóa: 400 "Thiếu header Idempotency-Key"; đơn không ở `PENDING`, `PAYMENT_FAILED`: 400; quá hạn: 400 "Đơn đã hết thời gian thanh toán"; giao dịch trước chưa rõ kết quả: 409 |
| `GET /payments/vnpay-return` | Không | Trang `/payment/result` của web gửi lại nguyên tham số VNPay trả về. Server kiểm tra chữ ký, số tiền, truy vấn lại VNPay rồi trả `{ orderId, code, status, message }` (`message`: "Thanh toán thành công", lý do thất bại, hoặc "Đang kiểm tra thanh toán"). Sai chữ ký: 400 "Chữ ký VNPay không hợp lệ"; sai số tiền: 400 "Số tiền VNPay không khớp với đơn hàng" |
| `GET /payments/vnpay-ipn` | Không | VNPay báo kết quả thẳng về API; trả `{ RspCode, Message }` theo quy định của VNPay |
| `POST /promotions/validate` | Có | Kiểm tra mã ở Checkout `{ code, subtotal }`: 200 `{ code, discount, total }`; mã không tồn tại, ngừng, hết hạn, chưa đạt tối thiểu: 400 kèm lý do |
| `PATCH /staff/orders/:id/status` | Nhân viên | `{ status }`: `PAID → PREPARING → READY → COMPLETED`, hủy đơn `PAID` (`CANCELLED`). Bước sai: 400; đơn vừa đổi trạng thái: 409 "Đơn vừa đổi trạng thái, vui lòng tải lại" |
| `GET /staff/revenue` | Nhân viên | Doanh thu theo BR-14 (chỉ giao dịch thành công của đơn không hủy, không hoàn tiền): `{ total, count, todayTotal, todayCount, transactions }`; "hôm nay" tính theo giờ Việt Nam |
| `GET /staff/ingredients` | Nhân viên | Tồn kho từng nguyên liệu `{ id, name, unit, stock, lowStock }`; `lowStock` = không còn đủ pha 10 ly (size M) của món hoặc topping dùng nguyên liệu đó nhiều nhất |
| `POST /staff/ingredients/:id/restock` | Nhân viên | Nhập kho `{ amount }` (số nguyên 1 – 1.000.000) cộng thêm vào tồn kho: 200 kèm tồn kho mới. Số lượng sai hoặc mã không phải số: 400; không có nguyên liệu: 404 |

Route cần đăng nhập nhận header `Authorization: Bearer <accessToken>` (JWT hết hạn sau 1 ngày, `JWT_EXPIRES_IN`). Thiếu token: 401 "Vui lòng đăng nhập"; token sai hoặc hết hạn: 401 "Phiên đăng nhập đã hết hạn"; Khách hàng gọi API của Nhân viên: 403 "Chỉ nhân viên được truy cập". Không API nào trả mật khẩu hay giá trị băm.

Đơn hàng trả về gồm `id`, `code`, `status`, `subtotal`, `discount`, `total`, `promotionCode`, `paymentMethod`, `expiresAt`, `createdAt`, `refundStatus` và `items` (`productName`, `size`, `toppings`, `quantity`, `unitPrice`, `lineTotal`). Cứ 30 giây API kiểm tra một lần, đơn `PENDING` hoặc `PAYMENT_FAILED` quá hạn thì hỏi lại VNPay, chưa có tiền thì tự hủy và trả kho; quá hạn thêm 10 phút mà VNPay vẫn lỗi khi truy vấn thì cũng hủy (FR-13, BR-05). Đơn thành `PAID` thì cộng điểm (tổng đơn ÷ 10.000); hủy đơn `PAID` thì trừ lại điểm và hoàn tiền qua VNPay; hoàn tiền lỗi thì `refundStatus` là `FAILED` ("Đang hoàn tiền") và cứ 60 giây thử lại.

**Thanh toán VNPay Sandbox:** điền `VNP_TMN_CODE`, `VNP_HASH_SECRET` (xin trưởng nhóm) vào `.env`; thiếu thì `POST /payments` trả 503 "Chưa cấu hình thanh toán VNPay". Khóa chỉ nằm trong `.env` và Render, không commit, không gửi lên nhóm chat. Ở máy cá nhân VNPay không gọi IPN tới được `localhost`, kết quả đi qua Return URL và truy vấn lại.

Module khác bảo vệ route bằng guard của `src/auth`:

```ts
@UseGuards(JwtAuthGuard)              // bắt buộc đăng nhập; lấy người dùng bằng @CurrentUser() user: AuthUser
@UseGuards(JwtAuthGuard, StaffGuard)  // chỉ Nhân viên
```

## Dữ liệu mẫu

Seed (`src/seed/`) tạo 14 món thuộc 4 danh mục (Cà phê, Trà, Đá xay, Nước ép, sinh tố), 9 topping, 22 nguyên liệu kèm công thức, và:

| Mã giảm giá | Loại | Điều kiện | Dùng để thử |
| --- | --- | --- | --- |
| `GIAM10` | Giảm 10% | Tạm tính từ 50.000đ | Mã hợp lệ |
| `GIAM20K` | Giảm 20.000đ | Tạm tính từ 100.000đ | Mã hợp lệ |
| `HETHAN` | Giảm 15% | Đã hết hạn | Báo lỗi mã hết hạn |
| `NGUNG` | Giảm 10.000đ | Ngừng hoạt động | Báo lỗi mã ngừng hoạt động |

| Tài khoản | Mật khẩu | Vai trò |
| --- | --- | --- |
| `khach@brewlite.vn` | `123456` | Khách hàng |
| `staff@brewlite.vn` | `123456` | Nhân viên |

Món "Sinh tố bơ" cố ý thiếu nguyên liệu để menu có món "Hết món". Chạy lại seed không đặt lại tồn kho, không đổi mật khẩu, không xóa đơn hàng.

## Tạo lại database

Database tạo lại được từ đầu chỉ bằng migration và seed (NFR-17, ADR 003). Cả hai chạy lại nhiều lần không lỗi: migration đã chạy thì bỏ qua, seed dùng `upsert` nên không tạo trùng.

| Môi trường | Cách chạy |
| --- | --- |
| Máy cá nhân | Bật database bằng `docker compose up -d db` (ở gốc repo), rồi trong `apps/api` chạy `npm run db:setup` |
| Docker Compose | `docker compose up --build -d`: container API tự chạy `prisma migrate deploy` rồi seed trước khi nhận yêu cầu (`docker-start.sh`) |
| Production | Render chạy cùng Docker image nên làm y như Docker Compose ở mỗi lần triển khai; migration lỗi thì bản mới không khởi động, bản cũ vẫn chạy (ADR 008) |
| CI | Job `Database (migration, seed)` chạy `npm run db:setup` hai lần trên database trống, bảng nào không có dữ liệu hoặc số dòng lần 2 khác lần 1 thì báo đỏ |

Không chạy `prisma migrate dev` hay `prisma migrate reset` trên database production: hai lệnh này có thể xóa dữ liệu.

## Integration test

Integration test (mã `INT-T`) nằm ở `tests/integration` ở gốc repo và dùng thư viện của `apps/api` (ADR 001). Test dựng API thật nối PostgreSQL thật, gọi API bằng HTTP rồi đọc lại database để kiểm tra: tạo đơn, trừ và trả kho, 20 đơn đặt cùng lúc khi kho chỉ đủ 3 ly (NFR-02), vòng đời trạng thái đơn; thanh toán: tạo giao dịch, 5 yêu cầu cùng `Idempotency-Key` gửi đồng thời, xác minh kết quả VNPay, điểm thưởng, thanh toán lại, hoàn tiền, tự hủy đơn có giao dịch đang chờ. Cổng VNPay được thay bằng bản giả lập (`test/fake-payment-gateway.ts`), nên test không gọi VNPay Sandbox.

Test cần một database **riêng** có tên kết thúc bằng `_test`: trước mỗi test, đơn hàng bị xóa và tồn kho được đặt lại theo dữ liệu mẫu. Thiếu `TEST_DATABASE_URL` hoặc tên database không kết thúc bằng `_test` thì test dừng ngay, không đụng database khác. Chạy ở máy cá nhân (PowerShell):

```powershell
# Ở gốc repo: bật database, tạo database test (chỉ cần tạo một lần)
docker compose up -d db
docker compose exec db createdb -U brewlite brewlite_test
# Trong apps/api
$env:TEST_DATABASE_URL = "postgresql://brewlite:brewlite@localhost:5432/brewlite_test"
npm run test:integration
```

Lệnh tự chạy migration và seed vào database test trước khi chạy test (`tests/integration/global-setup.ts`). Trong CI, job `Integration test (tests/integration)` làm các bước trên với một PostgreSQL trống.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/config` | Kiểm tra biến môi trường lúc khởi động |
| `src/prisma` | Kết nối database dùng chung |
| `src/health` | `GET /health` |
| `src/common` | Ghi log mỗi yêu cầu; tính nguyên liệu theo công thức và size (`recipe.ts`), phụ thu size và đơn giá (`pricing.ts`) |
| `src/seed` | Dữ liệu mẫu và lệnh nạp dữ liệu |
| `src/products` | `GET /products`, `GET /products/:id`, `POST /products/availability` |
| `src/orders` | Tạo đơn, trừ và trả kho (`orders.service.ts`), vòng đời trạng thái (`order-status.ts`), tự hủy đơn quá hạn (`order-expiry.service.ts`), việc cần PaymentsModule làm (`payment-hooks.ts`) |
| `src/payments` | Thanh toán: interface cổng thanh toán (`payment-gateway.ts`), kết nối VNPay (`vnpay.gateway.ts`), idempotency, xác minh kết quả, điểm thưởng, hoàn tiền (`payments.service.ts`) |
| `src/promotions` | Kiểm tra mã giảm giá |
| `src/staff` | API của Nhân viên: đổi trạng thái đơn, doanh thu, kho và nhập kho |
| `src/auth` | Đăng ký, đăng nhập, JWT; `JwtAuthGuard` (bắt buộc đăng nhập), `StaffGuard` (chỉ Nhân viên), `@CurrentUser()` |
| `prisma` | Schema và migration database |
