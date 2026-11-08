# ADR 007: Quản lý cấu hình và khóa bí mật bằng biến môi trường

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

Cùng một mã nguồn chạy ở ba môi trường: **máy cá nhân** (Docker Compose), **CI** (GitHub Actions) và **production** (Vercel, Render). Mỗi môi trường có địa chỉ database, địa chỉ web, khóa VNPay khác nhau. Khóa bí mật (mật khẩu database, khóa ký JWT, khóa VNPay) không được nằm trong repo hay log CI (NFR-07). Thiếu một biến cấu hình thì phải phát hiện ngay lúc khởi động, không để đến khi khách thanh toán mới báo lỗi.

## Quyết định

**1. Mọi cấu hình đọc từ biến môi trường**, không ghi cứng trong code.
- API dùng `@nestjs/config` (`ConfigModule` dùng chung toàn ứng dụng).
- **Kiểm tra lúc khởi động:** thiếu biến bắt buộc hoặc sai kiểu thì API dừng ngay và báo tên biến bị thiếu. Thông báo không in giá trị của biến.

**2. Tệp cấu hình trong repo**
- `.env.example` được commit, liệt kê **đủ tên biến**, giá trị chỉ là mẫu (ví dụ `JWT_SECRET=doi-gia-tri-nay`).
- `.env` (giá trị thật ở máy cá nhân) nằm trong `.gitignore`, không bao giờ commit.

**3. Danh sách biến**

| Biến | Dùng ở | Bí mật | Ghi chú |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | Có | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | API | Có | Khóa ký JWT |
| `JWT_EXPIRES_IN` | API | Không | Mặc định `1d` |
| `PORT` | API | Không | Máy cá nhân `4000`; Render tự đặt |
| `CORS_ORIGIN` | API | Không | Địa chỉ web được phép gọi API |
| `ORDER_PAYMENT_MINUTES` | API | Không | Hạn thanh toán, mặc định `5` |
| `VNP_TMN_CODE` | API | Có | Mã cửa hàng VNPay Sandbox |
| `VNP_HASH_SECRET` | API | Có | Khóa ký của VNPay Sandbox |
| `VNP_PAY_URL`, `VNP_API_URL` | API | Không | Địa chỉ trang thanh toán và API truy vấn, hoàn tiền của Sandbox |
| `VNP_RETURN_URL` | API | Không | Trang `/payment/result` của web |
| `APP_VERSION` | API | Không | Mã commit, pipeline ghi vào image lúc build; `/health` trả về để smoke test |
| `NEXT_PUBLIC_API_URL` | Web | Không | Địa chỉ API, ghi vào lúc build |

**4. Giá trị thật ở từng môi trường**

| Môi trường | Nơi đặt giá trị |
| --- | --- |
| Máy cá nhân | Tệp `.env` chép từ `.env.example`; Docker Compose đọc tệp này |
| CI | Biến môi trường trong workflow, chỉ là giá trị test; khóa thật lưu ở **GitHub Actions Secrets** |
| Production | **Render Environment** (biến của API), **Vercel Environment Variables** (biến của web) |

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Biến môi trường + `@nestjs/config`, kiểm tra lúc khởi động** (chọn) | Theo nguyên tắc 12-factor; Docker, Render, Vercel, GitHub Actions đều hỗ trợ sẵn; thiếu biến là biết ngay | Biến nằm rải ở nhiều nơi (máy, GitHub, Render, Vercel), phải ghi rõ tên trong `.env.example` |
| Tệp cấu hình riêng cho từng môi trường (`config.production.json`) commit vào repo | Xem cấu hình dễ | Dễ lỡ commit khóa bí mật; đổi cấu hình phải build lại |
| Dịch vụ quản lý bí mật (Vault, Doppler) | Quản lý tập trung, có lịch sử | Thêm dịch vụ và tài khoản; quá nặng với dự án nhỏ |

## Hệ quả

**Tích cực**
- Repo không chứa khóa bí mật. Người mới chỉ cần chép `.env.example` thành `.env` là chạy được.
- Cấu hình sai bị phát hiện ngay khi container khởi động. Health check không đạt nên bản lỗi không thay bản đang chạy (ADR 006, ADR 008).

**Tiêu cực, đánh đổi**
- Thêm biến mới phải nhớ cập nhật bốn nơi: `.env.example`, `.env` của từng bạn, Render và Vercel (hoặc GitHub Secrets). Quy ước: PR nào thêm biến thì ghi rõ trong mô tả PR.
- `NEXT_PUBLIC_API_URL` ghi vào lúc build, nên trình duyệt đọc được. Biến có tiền tố `NEXT_PUBLIC_` không bao giờ được chứa khóa bí mật.
- Chỉ trưởng nhóm giữ giá trị thật của khóa production. Các bạn khác chỉ cần biết tên biến.

## Liên quan

- Yêu cầu: NFR-07, NFR-16.
- ADR 005 (khóa VNPay), ADR 006 (health check), ADR 008 (nền tảng triển khai, secret của CI).