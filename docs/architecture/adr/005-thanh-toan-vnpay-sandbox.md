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
   - VNPay không trả lời được khi truy vấn (Sandbox trả mã 99, mất kết nối): dùng kết quả đã qua hai bước đầu, vì chữ ký được tạo bằng khóa bí mật của quán nên không giả được. VNPay trả lời chưa thanh toán thì chưa ghi nhận.
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

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **VNPay Sandbox** (chọn) | Luồng giống thanh toán thật (chuyển trang, chữ ký, IPN, truy vấn, hoàn tiền); hỗ trợ VND và thẻ nội địa; miễn phí | Phụ thuộc máy chủ Sandbox; IPN không gọi tới được `localhost`; Sandbox đôi khi lỗi khi hoàn tiền |
| Tự viết cổng giả lập trong hệ thống | Chủ động hoàn toàn, test dễ, không phụ thuộc bên ngoài | Không có chữ ký và chuyển trang thật, khó thể hiện xác minh kết quả; thêm một phần phải tự viết |
| Stripe (chế độ test) | Tài liệu tốt, SDK đầy đủ | Không mở tài khoản được cho cửa hàng ở Việt Nam; luồng khác thói quen thanh toán trong nước |
| MoMo (môi trường test) | Ví phổ biến ở Việt Nam | Chỉ có ví, không có thẻ; nhóm chưa quen tích hợp |

## Hệ quả

**Tích cực**
- Thể hiện đầy đủ các nhánh trong sequence diagram: xác minh chữ ký, `alt` thành công/thất bại, idempotency.
- Server không tin kết quả từ trình duyệt; đơn chỉ thành `PAID` khi đã xác minh.
- Nhờ `PaymentGateway`, CI chạy test thanh toán ổn định, không cần mạng ngoài.

**Tiêu cực, đánh đổi**
- Khi chạy ở máy cá nhân, IPN không về được. Hệ thống dựa vào Return URL và truy vấn lại giao dịch. Nếu khách đóng trình duyệt trước khi quay về, tác vụ định kỳ sẽ hỏi lại VNPay trước khi tự hủy đơn.
- Sandbox có lúc chậm hoặc lỗi. Đơn bị lỗi thì ở trạng thái "Đang hoàn tiền" và được thử lại, không làm hỏng dữ liệu đơn.
- Lệnh truy vấn giao dịch của Sandbox có lúc trả mã 99. Khi đó thanh toán thành công được ghi nhận dựa trên chữ ký và số tiền, không có bước xác nhận thứ ba; log ghi lại mã lỗi để kiểm tra.
- Test tự động dùng bản giả lập nên không kiểm tra VNPay thật. Phần này được kiểm tra thủ công trên production trước khi bàn giao.

## Liên quan

- Yêu cầu: BR-05, BR-12, BR-13, FR-14 – FR-18, NFR-07.
- Sơ đồ: `docs/diagrams/sequence-checkout.puml`, `docs/requirements/uc-04-dat-va-thanh-toan.md`.
- ADR 003 (backend), ADR 007 (quản lý cấu hình).
