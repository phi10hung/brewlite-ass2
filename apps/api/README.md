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
| `npm run build` | Build ra thư mục `dist` |
| `npx prisma migrate dev --name <tên>` | Tạo migration mới sau khi sửa `prisma/schema.prisma` |
| `npx prisma migrate deploy` | Áp dụng các migration chưa chạy vào database |
| `npx prisma db seed` | Nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi) |

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

Route cần đăng nhập nhận header `Authorization: Bearer <accessToken>` (JWT hết hạn sau 1 ngày, `JWT_EXPIRES_IN`). Thiếu token: 401 "Vui lòng đăng nhập"; token sai hoặc hết hạn: 401 "Phiên đăng nhập đã hết hạn"; Khách hàng gọi API của Nhân viên: 403 "Chỉ nhân viên được truy cập". Không API nào trả mật khẩu hay giá trị băm.

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

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/config` | Kiểm tra biến môi trường lúc khởi động |
| `src/prisma` | Kết nối database dùng chung |
| `src/health` | `GET /health` |
| `src/common` | Ghi log mỗi yêu cầu; tính nguyên liệu theo công thức và size (`recipe.ts`), phụ thu size (`pricing.ts`) |
| `src/seed` | Dữ liệu mẫu và lệnh nạp dữ liệu |
| `src/products` | `GET /products`, `GET /products/:id` |
| `src/auth` | Đăng ký, đăng nhập, JWT; `JwtAuthGuard` (bắt buộc đăng nhập), `StaffGuard` (chỉ Nhân viên), `@CurrentUser()` |
| `prisma` | Schema và migration database |
