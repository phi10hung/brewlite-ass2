# Ma trận truy vết – BrewLite

Liên kết mỗi yêu cầu chức năng trong phạm vi với use-case, thiết kế, mã nguồn và kiểm thử. Mã yêu cầu và use-case xem ở [srs.md](requirements/srs.md); mã kiểm thử đặt theo quy ước ở mục 6 của SRS. Các yêu cầu ngoài phạm vi (FR-25 – FR-32) không đưa vào ma trận.

Người phụ trách: Khoa

| Mã yêu cầu | Use-case | Thiết kế/Sơ đồ | Code/API | Test |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products`, `GET /products?category=`; màn `/` | API-T01, API-T02; CT-10 – CT-18; E2E-T01 |
| FR-02 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products`, `GET /products/:id` (số ly còn pha được, BR-03); màn `/`, `/products/:id` | UT-14 – UT-23; API-T03 – API-T05; CT-19, CT-29 |
| FR-03 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | `GET /products/:id`; màn `/products/:id` | API-T06 – API-T09; CT-23 – CT-31; E2E-T01 |
| FR-04 | UC-02 Quản lý giỏ hàng | Activity-01 | Giỏ lưu ở trình duyệt (`cart-store.ts`); màn `/cart` | CT-32 – CT-41, CT-52; E2E-T01 |
| FR-05 | UC-02 Quản lý giỏ hàng | Class-01 | `POST /products/availability`; màn `/cart` | API-T25; CT-67, CT-68 |
| FR-06 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | Màn `/checkout` gọi `POST /orders`, `POST /payments` | CT-69, CT-70, CT-72 – CT-74; E2E-T01 |
| FR-07 | UC-05 Áp dụng mã giảm giá | Activity-01, Sequence-01, Class-01 | `POST /promotions/validate`; màn `/checkout` | UT-58, UT-59; API-T30; INT-T01, INT-T02; CT-71 |
| FR-08 | UC-03 Đăng ký, đăng nhập | Activity-01, Class-01 | `POST /auth/register`; màn `/register` | UT-25, UT-26; API-T11 – API-T14; CT-49 – CT-51 |
| FR-09 | UC-03 Đăng ký, đăng nhập | Activity-01, Activity-02, Sequence-01, Class-01 | `POST /auth/login`, `GET /auth/me`; `JwtAuthGuard`, `StaffGuard`; màn `/login` | UT-27 – UT-35; API-T15 – API-T18; CT-42 – CT-48, CT-52, CT-59, CT-60, CT-83; E2E-T01 |
| FR-10 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /orders` | UT-39, UT-40, UT-48; API-T19 – API-T21; INT-T01, INT-T02; CT-72; E2E-T01 |
| FR-11 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /orders` (trừ trong transaction, khóa lạc quan `version`), `PATCH /orders/:id/cancel` | UT-41, UT-42, UT-45 – UT-47, UT-49; INT-T01, INT-T02, INT-T04, INT-T05 |
| FR-12 | UC-04 Đặt và thanh toán đơn hàng | Class-01 | `POST /orders` | UT-43, UT-44; INT-T03; CT-70 |
| FR-13 | UC-11 Tự hủy đơn quá hạn | Activity-01, Class-01 | Tác vụ `cancelExpiredOrders` mỗi 30 giây (`order-expiry.service.ts`) | UT-53, UT-54, UT-73, UT-80; INT-T05, INT-T13; CT-80 |
| FR-14 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /payments`, `GET /payments/vnpay-return`, `GET /payments/vnpay-ipn` (`VnpayGateway`); màn `/checkout`, `/payment/result` | UT-60 – UT-63, UT-65 – UT-67, UT-79; API-T26 – API-T29; INT-T07, INT-T09; CT-72, CT-75; E2E-T01 |
| FR-15 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `POST /payments` (header `Idempotency-Key`); `GET /payments/vnpay-return`, `GET /payments/vnpay-ipn` nhận lại nhiều lần | UT-64, UT-68; API-T27, API-T29; INT-T07 – INT-T09 |
| FR-16 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | `GET /payments/vnpay-return`, `POST /payments`; màn `/payment/result`, `/orders/:id` (Thanh toán tiếp) | UT-65, UT-69, UT-74; INT-T08, INT-T10, INT-T11; CT-76, CT-80; E2E-T02 |
| FR-17 | UC-07 Hủy đơn; UC-12 Thử lại hoàn tiền | Activity-02, Class-01 | `PATCH /orders/:id/cancel`; tác vụ `retryRefunds` mỗi 60 giây (`payments.service.ts`); màn `/orders/:id` | UT-49 – UT-52, UT-70 – UT-72; API-T23; INT-T05, INT-T12; CT-81 |
| FR-18 | UC-04 Đặt và thanh toán đơn hàng; UC-13 Xem điểm thưởng | Activity-01, Sequence-01, Class-01 | Cộng, trừ điểm trong `payments.service.ts`; `GET /auth/me` (`loyaltyPoints`); thanh điều hướng | UT-30, UT-68, UT-70, UT-71; API-T18; INT-T09, INT-T12; CT-82; E2E-T01 |
| FR-19 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01 | `GET /payments/vnpay-return`; màn `/payment/result` | API-T28; CT-75 – CT-77; E2E-T01, E2E-T02 |
| FR-20 | UC-06 Theo dõi đơn và lịch sử | Activity-01, Class-01 | `GET /orders/me`, `GET /orders/:id`; màn `/orders`, `/orders/:id` | UT-52; API-T22; CT-78 – CT-80; E2E-T01 |
| FR-21 | UC-07 Hủy đơn; UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | Bảng chuyển trạng thái `order-status.ts`; `PATCH /staff/orders/:id/status`, `PATCH /orders/:id/cancel` | UT-36 – UT-38, UT-51, UT-55, UT-56; INT-T06 |
| FR-22 | UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | `GET /staff/orders`, `PATCH /staff/orders/:id/status`; màn `/staff` | UT-55 – UT-57; API-T24; INT-T06; CT-53 – CT-58 |
| FR-23 | UC-09 Xem doanh thu | Class-01 | `GET /staff/revenue`; màn `/staff/revenue` | UT-77, UT-78; API-T31; CT-61, CT-62 |
| FR-24 | UC-10 Quản lý kho, nhập kho | Class-01 | `GET /staff/ingredients`, `POST /staff/ingredients/:id/restock`; màn `/staff/ingredients` | UT-75, UT-76; API-T31, API-T32; CT-63 – CT-66 |

Cột Code/API và Test được điền ở Task 4 và Task 5.

## Mã sơ đồ thiết kế

| Mã | Sơ đồ | Tệp |
| --- | --- | --- |
| Activity-01 | Khách hàng đặt và thanh toán đơn hàng | [activity-01-dat-va-thanh-toan.puml](diagrams/activity-01-dat-va-thanh-toan.puml) |
| Activity-02 | Nhân viên xử lý đơn tại quầy | [activity-02-nhan-vien-xu-ly-don.puml](diagrams/activity-02-nhan-vien-xu-ly-don.puml) |
| Sequence-01 | Đặt và thanh toán đơn hàng (UC-04) | [sequence-checkout.puml](diagrams/sequence-checkout.puml) |
| Class-01 | Mô hình domain | [class-domain.puml](diagrams/class-domain.puml) |