# Ma trận truy vết – BrewLite

Liên kết mỗi yêu cầu chức năng trong phạm vi với use-case, thiết kế, mã nguồn và kiểm thử. Mã yêu cầu và use-case xem ở [srs.md](requirements/srs.md); mã kiểm thử đặt theo quy ước ở mục 6 của SRS. Các yêu cầu ngoài phạm vi (FR-25 – FR-32) không đưa vào ma trận.

Người phụ trách: Khoa

| Mã yêu cầu | Use-case | Thiết kế/Sơ đồ | Code/API | Test |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products`, `GET /products?category=`; màn `/` | |
| FR-02 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products`, `GET /products/:id` (số ly còn pha được, BR-03); màn `/`, `/products/:id` | |
| FR-03 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products/:id`; màn `/products/:id` | |
| FR-04 | UC-02 Quản lý giỏ hàng | Activity-01 | Giỏ lưu ở trình duyệt (`cart-store.ts`); màn `/cart` | |
| FR-05 | UC-02 Quản lý giỏ hàng | Class-01 | `POST /products/availability`; màn `/cart` | |
| FR-06 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | Màn `/checkout` gọi `POST /orders`, `POST /payments` | |
| FR-07 | UC-05 Áp dụng mã giảm giá | Activity-01, Sequence-01, Class-01 | `POST /promotions/validate`; màn `/checkout` | |
| FR-08 | UC-03 Đăng ký, đăng nhập | Activity-01, Class-01 | `POST /auth/register`; màn `/register` | |
| FR-09 | UC-03 Đăng ký, đăng nhập | Activity-01, Activity-02, Sequence-01, Class-01 | `POST /auth/login`, `GET /auth/me`; `JwtAuthGuard`, `StaffGuard`; màn `/login` | |
| FR-10 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /orders` | |
| FR-11 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /orders` (trừ trong transaction, khóa lạc quan `version`), `PATCH /orders/:id/cancel` | |
| FR-12 | UC-04 Đặt và thanh toán đơn hàng | Class-01 | `POST /orders` | |
| FR-13 | UC-11 Tự hủy đơn quá hạn | Activity-01, Class-01 | Tác vụ `cancelExpiredOrders` mỗi 30 giây (`order-expiry.service.ts`) | |
| FR-14 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /payments`, `GET /payments/vnpay-return`, `GET /payments/vnpay-ipn` (`VnpayGateway`); màn `/checkout`, `/payment/result` | |
| FR-15 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /payments` (header `Idempotency-Key`); `GET /payments/vnpay-return`, `GET /payments/vnpay-ipn` nhận lại nhiều lần | |
| FR-16 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `GET /payments/vnpay-return`, `POST /payments`; màn `/payment/result`, `/orders/:id` (Thanh toán tiếp) | |
| FR-17 | UC-07 Hủy đơn; UC-12 Thử lại hoàn tiền | Activity-02, Class-01 | `PATCH /orders/:id/cancel`; tác vụ `retryRefunds` mỗi 60 giây (`payments.service.ts`); màn `/orders/:id` | |
| FR-18 | UC-04 Đặt và thanh toán đơn hàng; UC-13 Xem điểm thưởng | Activity-01, Sequence-01, Class-01 | Cộng, trừ điểm trong `payments.service.ts`; `GET /auth/me` (`loyaltyPoints`); thanh điều hướng | |
| FR-19 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01 | `GET /payments/vnpay-return`; màn `/payment/result` | |
| FR-20 | UC-06 Theo dõi đơn và lịch sử | Activity-01, Class-01 | `GET /orders/me`, `GET /orders/:id`; màn `/orders`, `/orders/:id` | |
| FR-21 | UC-07 Hủy đơn; UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | Bảng chuyển trạng thái `order-status.ts`; `PATCH /staff/orders/:id/status`, `PATCH /orders/:id/cancel` | |
| FR-22 | UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | `GET /staff/orders`, `PATCH /staff/orders/:id/status`; màn `/staff` | |
| FR-23 | UC-09 Xem doanh thu | Class-01 | `GET /staff/revenue`; màn `/staff/revenue` | |
| FR-24 | UC-10 Quản lý kho, nhập kho | Class-01 | `GET /staff/ingredients`, `POST /staff/ingredients/:id/restock`; màn `/staff/ingredients` | |

Cột Code/API và Test được điền ở Task 4 và Task 5.

## Mã sơ đồ thiết kế

| Mã | Sơ đồ | Tệp |
| --- | --- | --- |
| Activity-01 | Khách hàng đặt và thanh toán đơn hàng | [activity-01-dat-va-thanh-toan.puml](diagrams/activity-01-dat-va-thanh-toan.puml) |
| Activity-02 | Nhân viên xử lý đơn tại quầy | [activity-02-nhan-vien-xu-ly-don.puml](diagrams/activity-02-nhan-vien-xu-ly-don.puml) |
| Sequence-01 | Đặt và thanh toán đơn hàng (UC-04) | [sequence-checkout.puml](diagrams/sequence-checkout.puml) |
| Class-01 | Mô hình domain | [class-domain.puml](diagrams/class-domain.puml) |