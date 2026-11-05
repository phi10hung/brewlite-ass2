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

## 3. Phạm vi

Phạm vi khớp với mức ưu tiên MoSCoW trong [srs.md](srs.md): trong MVP là các yêu cầu **Must**, phạm vi mở rộng là **Should** và **Could**, không thực hiện là **Won't**.

### 3.1 Trong MVP (in-scope)

Phiên bản nhỏ nhất chạy được trọn luồng nghiệp vụ tối thiểu, triển khai lên production:

- Xem menu, hiển thị "Hết món" khi không còn đủ nguyên liệu.
- Xem chi tiết món, chọn size (S, M, L) và topping, thấy giá và số ly còn pha được.
- Giỏ hàng: thêm, sửa số lượng, xóa món, tự tính tổng tiền.
- Đăng ký, đăng nhập bằng JWT; phân quyền Khách hàng và Nhân viên.
- Đặt đơn: server tính giá, trừ nguyên liệu trong transaction, không bán vượt lượng còn pha được; tự hủy đơn quá hạn thanh toán.
- Thanh toán Ví/Thẻ mô phỏng qua VNPay Sandbox, có idempotency; thanh toán thất bại thì báo lỗi, giữ giỏ hàng và cho thanh toán lại.
- Xác nhận đơn, theo dõi trạng thái, lịch sử đơn.
- Nhân viên xem đơn đã thanh toán và đổi trạng thái: nhận đơn, pha xong, giao khách.
- Giao diện mobile-first, cài được dạng PWA, có trạng thái đang tải, trống và lỗi; xử lý lỗi và validate dữ liệu ở cả web và server.
- Migration và seed tái tạo được database; health check, ghi log; Docker Compose chạy web, API và database ở local; CI/CD tự động; bản production truy cập được qua HTTPS.

### 3.2 Phạm vi mở rộng

Làm trong phiên bản này sau khi xong MVP, theo thứ tự Should rồi Could:

| Nội dung | Mức |
| --- | --- |
| Mã giảm giá (giảm theo phần trăm hoặc số tiền cố định) | Should |
| Tích điểm thưởng sau khi đơn thanh toán thành công | Should |
| Hủy đơn và hoàn tiền qua VNPay Sandbox | Should |
| Cảnh báo vượt lượng còn pha được ngay trong giỏ hàng | Should |
| Mỗi khách giữ một đơn chờ thanh toán | Should |
| Nhân viên xem doanh thu, xem kho và nhập kho | Should |
| PWA xem được menu khi mất mạng | Could |

### 3.3 Không thực hiện (out-of-scope)

| Nội dung | Lý do |
| --- | --- |
| Vai trò Quản lý cửa hàng riêng | Quản lý dùng tài khoản Nhân viên để xem doanh thu và kho |
| Thêm, sửa món và giá | Là việc của quản lý, cần vai trò Quản lý riêng; menu được nạp bằng dữ liệu seed |
| Quản lý mã giảm giá | Là việc của quản lý, cần vai trò Quản lý riêng; mã giảm giá được nạp bằng dữ liệu seed |
| Đổi điểm thưởng lấy ưu đãi | Phiên bản này chỉ tích điểm |
| Giao hàng tận nơi | Khách nhận đồ uống tại quầy |
| Thông báo đẩy khi đơn đổi trạng thái | Khách xem trạng thái trên trang đơn hàng |
| Nhiều chi nhánh | Hệ thống phục vụ một cửa hàng |
| Thanh toán bằng tiền thật | Chỉ dùng môi trường thử VNPay Sandbox |
| Tự mở rộng thêm server khi đông người dùng | Dùng gói hạ tầng miễn phí, một server |
| Ứng dụng di động riêng (Android, iOS) | Dùng web mobile-first cài được dạng PWA |
