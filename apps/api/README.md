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
| `npx prisma migrate dev` | Tạo migration mới sau khi sửa `prisma/schema.prisma` |

API đọc biến môi trường từ tệp `.env` ở gốc repo (chép từ `.env.example`).

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/config` | Kiểm tra biến môi trường lúc khởi động |
| `src/prisma` | Kết nối database dùng chung |
| `src/health` | `GET /health` |
| `src/common` | Ghi log mỗi yêu cầu |
| `prisma` | Schema và migration database |
