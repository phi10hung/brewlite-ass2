# ADR 003: Backend NestJS chia theo module, PostgreSQL với Prisma migration

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

API của BrewLite xử lý nhiều nghiệp vụ liên quan nhau: menu và tồn kho nguyên liệu, giỏ hàng và đơn hàng, thanh toán, hoàn tiền, mã giảm giá, điểm thưởng, màn hình nhân viên. Sáu người cùng viết API trong 2 Sprint, nên code phải chia rõ phần để ít đụng nhau. Dữ liệu có nhiều quan hệ (đơn – dòng đơn – nguyên liệu đã trừ – thanh toán) và cần transaction (BR-04, BR-08). Database phải tạo lại được từ đầu bằng migration và seed (NFR-17). Công nghệ bắt buộc là NestJS và PostgreSQL.

## Quyết định

**1. NestJS chia theo module nghiệp vụ** (mã nguồn trong `apps/api/src`):

| Module | Trách nhiệm | API chính |
| --- | --- | --- |
| `AuthModule` | Đăng ký, đăng nhập, phát JWT; guard kiểm tra token và vai trò | `/auth/*` |
| `ProductsModule` | Menu, chi tiết món, tính số ly còn pha được từ nguyên liệu | `/products`, `/products/:id`, `/products/availability` |
| `OrdersModule` | Tạo đơn, trừ và trả kho, hủy đơn, lịch sử đơn, tự hủy đơn quá hạn | `/orders/*` |
| `PaymentsModule` | Tạo thanh toán, idempotency, xác minh kết quả, hoàn tiền, cộng và trừ điểm | `/payments/*` |
| `PromotionsModule` | Kiểm tra mã giảm giá | `/promotions/validate` |
| `StaffModule` | Đổi trạng thái đơn, doanh thu, kho và nhập kho cho nhân viên | `/staff/*` |
| `HealthModule` | Kiểm tra API và database còn hoạt động | `/health` |
| `PrismaModule` | Cung cấp kết nối database cho các module khác | — |

- Mỗi module gồm controller (nhận yêu cầu), service (xử lý nghiệp vụ) và DTO (kiểm tra dữ liệu bằng `class-validator`).
- `ValidationPipe` dùng chung cho toàn API, bật `whitelist` và `forbidNonWhitelisted`: trường không được khai báo thì trả 400 (BR-02, NFR-06).
- Các tác vụ định kỳ (tự hủy đơn quá hạn, thử lại hoàn tiền) chạy trong API bằng `@nestjs/schedule`.

**2. PostgreSQL 16 + Prisma ORM**
- Schema viết ở `apps/api/prisma/schema.prisma`, khớp class diagram (`docs/diagrams/class-domain.puml`).
- **Migration:**
  - Khi lập trình: chạy `prisma migrate dev` để sinh tệp migration SQL trong `apps/api/prisma/migrations/`, rồi commit tệp đó cùng PR.
  - Khi triển khai: container API chạy `prisma migrate deploy` rồi nạp dữ liệu mẫu (seed) **trước khi** mở cổng nhận yêu cầu (`apps/api/docker-start.sh`). `migrate deploy` chỉ chạy các migration chưa áp dụng. Seed tự chạy mỗi lần container khởi động vì gói miễn phí của Render không có cửa sổ lệnh để chạy seed bằng tay; seed dùng `upsert` nên chạy lại không tạo trùng, không đặt lại tồn kho, không xóa đơn hàng.
  - Migration chỉ **thêm** (thêm bảng, thêm cột cho phép rỗng hoặc có giá trị mặc định). Muốn xóa hay đổi tên cột thì tách thành hai lần phát hành, để bản API cũ vẫn chạy được khi cần rollback.
- **Seed:** `prisma db seed` tạo món, topping, nguyên liệu, công thức, mã giảm giá và tài khoản mẫu. Seed dùng `upsert`, chạy lại nhiều lần không lỗi và không xóa đơn hàng đã có.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **NestJS chia module + Prisma** (chọn) | Mỗi bạn làm trong module của mình, ít conflict; Prisma sinh kiểu TypeScript từ schema; migration là tệp SQL đọc được, review được | Prisma không hỗ trợ sẵn `SELECT ... FOR UPDATE`, khóa dòng phải viết SQL thô (xem ADR 004) |
| NestJS + TypeORM | Tích hợp sẵn với NestJS, có khóa dòng | Migration sinh tự động dễ thiếu; kiểu dữ liệu kém chặt hơn |
| Viết SQL thuần (`pg`) | Kiểm soát hoàn toàn câu lệnh | Tự viết migration, ánh xạ dữ liệu; nhiều code lặp |
| Tách thành nhiều service nhỏ (microservice) | Triển khai độc lập từng phần | Quá nặng cho dự án nhỏ; transaction giữa đơn và kho khó làm |

## Hệ quả

**Tích cực**
- Ranh giới module trùng với cách chia việc, mỗi PR thường chỉ sửa một module.
- Database tạo lại được từ đầu chỉ bằng hai lệnh `migrate deploy` và `db seed` (NFR-17).
- Tác vụ định kỳ nằm trong API nên không cần thêm dịch vụ chạy nền.

**Tiêu cực, đánh đổi**
- Vẫn là **một ứng dụng chung (monolith)**: lỗi ở một module có thể làm dừng cả API. Chấp nhận vì hệ thống chỉ chạy một bản API (NFR-03 là Won't).
- Tác vụ định kỳ chạy trong API, nên nếu sau này chạy nhiều bản API thì phải chống chạy trùng.
- Gói miễn phí của nền tảng không có bước chạy lệnh riêng trước khi triển khai, nên migration chạy lúc container khởi động. Migration lỗi thì container không lên, health check báo lỗi, pipeline dừng (ADR 008).

## Liên quan

- Yêu cầu: BR-02, BR-04, NFR-03, NFR-05, NFR-06, NFR-17.
- Sơ đồ: `docs/diagrams/class-domain.puml`.
- ADR 004 (khóa tồn kho), ADR 005 (thanh toán), ADR 006 (log, health check), ADR 008 (nền tảng triển khai).
