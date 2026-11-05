# Bối cảnh, stakeholder và phạm vi – BrewLite

Tài liệu của Task 1.1. Yêu cầu chi tiết xem ở [srs.md](srs.md).

## 1. Vấn đề nghiệp vụ

Ở một quầy đồ uống nhỏ, vào giờ cao điểm khách phải xếp hàng để gọi món rồi xếp tiếp để trả tiền. Cách làm hiện tại gặp các vấn đề:

- **Mất thời gian:** gọi món, hỏi size, topping và thối tiền mặt làm hàng chờ dài; khách không biết đơn của mình đang ở bước nào.
- **Dễ sai:** nhân viên ghi nhầm món, size, topping hoặc tính sai tiền.
- **Bán khi đã hết nguyên liệu:** chỉ khi bắt đầu pha mới biết thiếu nguyên liệu, phải báo lại khách và hoàn tiền.
- **Khó quản lý:** cửa hàng khó biết doanh thu thật trong ngày và nguyên liệu nào sắp hết.

**BrewLite** là ứng dụng web chạy tốt trên điện thoại giúp khách **đặt và thanh toán đồ uống không dùng tiền mặt** chỉ trong vài thao tác, rồi tới quầy nhận đồ. Luồng nghiệp vụ tối thiểu:

> Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn

Hệ thống tính giá ở server, trừ nguyên liệu ngay khi đặt đơn để không nhận đơn vượt quá lượng còn pha được, và chỉ chuyển đơn cho quầy pha khi đã nhận được tiền. Nhân viên xử lý đơn theo thứ tự, cập nhật trạng thái để khách theo dõi trên điện thoại.

## 2. Stakeholder

| Stakeholder | Vai trò | Mục tiêu | Kỳ vọng | Cách tương tác với hệ thống |
| --- | --- | --- | --- | --- |
| Khách hàng | Người mua đồ uống | Đặt và trả tiền nhanh, không cần tiền mặt, không phải xếp hàng lâu | Menu dễ xem trên điện thoại, biết món còn hay đã hết; chọn được size, topping và thấy đúng giá; thanh toán an toàn, không bị trừ tiền hai lần; biết đơn đang ở trạng thái nào | Tài khoản Khách hàng |
| Nhân viên quầy | Người nhận đơn, pha chế và giao đồ uống | Xử lý đơn đúng món, đúng thứ tự, không nhận đơn đã hết nguyên liệu | Chỉ thấy đơn đã thanh toán; xem rõ món, size, topping; đổi trạng thái đơn bằng một thao tác | Tài khoản Nhân viên |
| Quản lý cửa hàng | Người điều hành cửa hàng | Theo dõi doanh thu và tồn kho để nhập thêm nguyên liệu kịp thời | Doanh thu chỉ tính tiền đã nhận thật; biết nguyên liệu nào sắp hết; nhập kho nhanh | Dùng tài khoản Nhân viên (không có vai trò riêng) |
| Giảng viên (khách hàng nghiệm thu) | Người đánh giá và nghiệm thu sản phẩm | Kiểm tra quy trình và sản phẩm đáp ứng yêu cầu | Đủ tạo phẩm từng task, có lịch sử thay đổi rõ ràng trên repository; chạy được theo README; truy cập được bản production qua URL | Không dùng tài khoản riêng; truy cập repository và bản production |
| Nhóm phát triển | 6 thành viên Nhóm 12 | Hoàn thành sản phẩm đúng hạn, đúng yêu cầu | Yêu cầu rõ ràng, phân công hợp lý, có CI/CD tự động phát hiện lỗi sớm | Phát triển, kiểm thử, triển khai hệ thống |
| Đơn vị thanh toán | Cổng thanh toán VNPay, dùng môi trường thử VNPay Sandbox | Xử lý giao dịch Ví/Thẻ chính xác, an toàn | Yêu cầu thanh toán có chữ ký hợp lệ, đúng số tiền; hệ thống xác minh kết quả trước khi ghi nhận | Hệ thống bên ngoài, trao đổi qua API |
