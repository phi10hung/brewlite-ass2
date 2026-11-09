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

API đọc biến môi trường từ tệp `.env` ở gốc repo (chép từ `.env.example`). Khi chạy bằng Docker, container tự chạy migration rồi nạp dữ liệu mẫu trước khi bật API (`docker-start.sh`).

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
| `src/common` | Ghi log mỗi yêu cầu |
| `src/seed` | Dữ liệu mẫu và lệnh nạp dữ liệu |
| `prisma` | Schema và migration database |
