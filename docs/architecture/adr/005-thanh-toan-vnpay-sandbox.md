# ADR 005: Dịch vụ thanh toán mô phỏng dùng VNPay Sandbox

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

BrewLite là ứng dụng đặt đồ uống không dùng tiền mặt. Khách thanh toán bằng **Ví** hoặc **Thẻ**, nhưng phiên bản này **không dùng tiền thật**, nên cần một dịch vụ thanh toán mô phỏng. Dịch vụ này phải:

- trả kết quả có chữ ký, để server tự xác minh mà không tin dữ liệu từ trình duyệt (BR-12);
- có thanh toán thành công, thất bại và hoàn tiền (FR-14 – FR-17);
- không tạo giao dịch trùng khi khách bấm nhiều lần hay mạng gửi lại (FR-15);
- chạy được ở production lúc nghiệm thu, và test tự động không phụ thuộc mạng ngoài.

## Quyết định

**1. Dùng VNPay Sandbox** (môi trường thử của VNPay, không trừ tiền thật) làm dịch vụ thanh toán mô phỏng:
- **Ví:** không gửi mã ngân hàng, khách chọn cách trả trên trang VNPay.
- **Thẻ:** gửi `bankCode = VNBANK` (thẻ nội địa).

**2. Luồng thanh toán:**
1. Web gọi `POST /payments` kèm JWT và header `Idempotency-Key`.
2. API tạo `Payment` và trả `payUrl` có chữ ký HMAC-SHA512.
3. Trình duyệt chuyển sang VNPay Sandbox. Khách trả xong, VNPay chuyển về trang `/payment/result` của web.
4. API xác minh kết quả theo ba bước: kiểm tra chữ ký, kiểm tra số tiền, rồi truy vấn lại giao dịch với VNPay (querydr).
   - Đủ ba điều kiện thì đơn thành `PAID` và được cộng điểm.
   - Giao dịch thất bại thì đơn đang chờ chuyển sang `PAYMENT_FAILED`. Kết quả cũ gửi lại không làm đơn đã `PAID` quay về `PAYMENT_FAILED` (FR-15).
5. Ở production, VNPay gửi thêm **IPN** (thông báo từ server VNPay tới `/payments/vnpay-ipn`). Cùng một kết quả về nhiều lần thì đơn chỉ cập nhật và cộng điểm **một lần**.

**3. Idempotency:** cột `Payment.idempotencyKey` là **unique**.
- Cùng khóa, cùng đơn và cùng phương thức: trả lại giao dịch cũ.
- Cùng khóa nhưng khác đơn hoặc khác phương thức: trả 409.
- Hai yêu cầu cùng khóa đến đồng thời cũng chỉ tạo một bản ghi, vì database chặn bản ghi trùng.

**4. Hoàn tiền:** hủy đơn đã `PAID` thì gọi API hoàn tiền của VNPay **sau khi** transaction hủy đơn đã xong. Lỗi thì đánh dấu "Đang hoàn tiền" và tác vụ định kỳ thử lại mỗi 60 giây (BR-13).

**5. Tách lớp kết nối:** `PaymentsModule` gọi VNPay qua một interface `PaymentGateway` (tạo `payUrl`, kiểm chữ ký, truy vấn, hoàn tiền).
- Bản `VnpayGateway` dùng khi chạy thật.
- Integration test và E2E test thay bằng bản giả lập trả kết quả cố định, nên test không phụ thuộc VNPay Sandbox.

**6. Bảo mật:** `VNP_TMN_CODE`, `VNP_HASH_SECRET` chỉ nằm trong biến môi trường (`.env` ở máy, secret ở nền tảng triển khai), không commit, không in ra log (NFR-07). Thẻ test của Sandbox không ghi vào repo.
