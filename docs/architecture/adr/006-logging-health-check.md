# ADR 006: Ghi log mỗi yêu cầu và health check cho API

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

Khi API chạy trên production, nhóm không mở được cửa sổ dòng lệnh để xem lỗi như ở máy cá nhân. Cần hai thứ:

- **Log:** biết yêu cầu nào đã đến, trả mã gì, mất bao lâu, để tìm lỗi khi khách báo. Mỗi yêu cầu phải có phương thức, đường dẫn, mã trạng thái, thời gian xử lý, và log không được chứa mật khẩu hay token (NFR-20).
- **Health check:** một địa chỉ để nền tảng triển khai, pipeline CD và người chấm biết API cùng database còn hoạt động (NFR-09). Bước smoke test và rollback trong CD cũng dựa vào địa chỉ này (NFR-19).

## Quyết định

**1. Log dùng `Logger` có sẵn của NestJS, in ra stdout dạng JSON một dòng**
- Một middleware ghi **một dòng log cho mỗi yêu cầu** khi trả phản hồi xong, ví dụ:
  `{"level":"log","pid":1,"timestamp":1794292650960,"message":{"method":"POST","path":"/orders","status":201,"durationMs":84},"context":"HTTP"}`
- Chỉ ghi **đường dẫn, không ghi query string, không ghi body, không ghi header**. Nhờ vậy log không chứa mật khẩu, JWT hay chữ ký thanh toán.
- Yêu cầu trả lỗi 5xx thì dòng log ghi ở mức `error`; lỗi không lường trước (500) được NestJS ghi thêm một dòng `error` kèm thông báo lỗi, để biết lỗi ở đâu. Lỗi 4xx chỉ ghi mã trạng thái.
- Log in ra stdout. Render tự gom log của container và hiển thị trong trang Logs; Docker Compose ở máy cá nhân xem bằng `docker compose logs api`.

**2. Health check `GET /health`** trong `HealthModule`
- Không cần đăng nhập.
- Chạy câu `SELECT 1` tới database:
  - database trả lời thì trả **200** `{"status":"ok","database":"up","version":"<mã commit>"}`;
  - lỗi thì trả **503** `{"status":"error","database":"down","version":"<mã commit>"}`.
- `version` là mã commit được ghi vào image lúc build (biến `APP_VERSION`). Nhờ trường này, smoke test biết chắc bản đang chạy là bản vừa triển khai.
- Phản hồi không chứa địa chỉ database hay thông tin bí mật.
- Health check được dùng ở ba nơi:
  - **Render:** khai báo Health Check Path = `/health`. Bản mới không đạt health check thì không thay bản cũ.
  - **Pipeline CD:** sau khi triển khai, bước smoke test gọi `/health` và phải nhận 200 với `version` đúng mã commit vừa build.
  - **Docker Compose:** `healthcheck` của dịch vụ `api`.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Logger của NestJS + middleware tự viết** (chọn) | Không thêm thư viện; kiểm soát được chính xác trường nào được ghi | Phải tự viết middleware và tự kiểm tra không lộ dữ liệu nhạy cảm |
| Thư viện `nestjs-pino` hoặc `winston` | Log có cấu trúc đầy đủ, nhanh | Thêm thư viện và cấu hình; mặc định có thể ghi cả header (lộ token) nếu cấu hình sai |
| Dịch vụ log bên ngoài (Better Stack, Datadog) | Tìm kiếm, cảnh báo tiện | Thêm tài khoản và khóa bí mật; vượt nhu cầu của dự án |
| **`/health` tự viết, có kiểm tra database** (chọn) | Đơn giản, đúng nhu cầu; phát hiện được khi database lỗi | Chỉ kiểm tra database, không kiểm tra VNPay |
| Thư viện `@nestjs/terminus` | Nhiều kiểu kiểm tra có sẵn | Thêm thư viện cho một việc nhỏ |
| `/health` luôn trả 200, không kiểm tra database | Rất đơn giản | Không phát hiện được lỗi database, smoke test vô nghĩa |

## Hệ quả

**Tích cực**
- Mỗi yêu cầu để lại đúng một dòng log dễ đọc, đủ để tìm lỗi trên production.
- CD và Render cùng dùng một tiêu chí "API khỏe", nên khi triển khai lỗi thì pipeline dừng và biết cần rollback.

**Tiêu cực, đánh đổi**
- Log chỉ lưu theo thời hạn của gói miễn phí Render, không lưu lâu dài.
- Không ghi body nên khó dựng lại nội dung yêu cầu khi điều tra lỗi. Đổi lại, log không lộ dữ liệu nhạy cảm.
- `/health` không kiểm tra VNPay, vì VNPay Sandbox lỗi không có nghĩa là API hỏng.
- Gói miễn phí tắt API sau một thời gian không có truy cập, nên lần gọi `/health` đầu tiên có thể chậm khoảng một phút.

## Liên quan

- Yêu cầu: NFR-07, NFR-09, NFR-19, NFR-20.
- ADR 003 (module backend), ADR 007 (quản lý cấu hình), ADR 008 (nền tảng triển khai).