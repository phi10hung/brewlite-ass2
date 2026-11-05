# Đặc tả yêu cầu phần mềm (SRS rút gọn) – BrewLite

Tài liệu của Task 1.2. Bối cảnh, stakeholder và phạm vi xem ở [context-and-scope.md](context-and-scope.md). Đặc tả chi tiết use-case trọng tâm xem ở [uc-04-dat-va-thanh-toan.md](uc-04-dat-va-thanh-toan.md).

<!--
Cách điền cho từng thành viên:
- Mỗi bạn chỉ sửa trong mục của mình (có ghi tên người phụ trách và dải mã).
- Thay dòng "chưa điền" bằng các dòng yêu cầu của mình, giữ nguyên tiêu đề mục và dòng tiêu đề bảng.
- Mức ưu tiên theo bảng MoSCoW ở mục 1.2; số liệu nghiệp vụ dẫn chiếu quy tắc BR-xx ở mục 1.4.
- Tiêu chí chấp nhận đánh số 1., 2., 3. trong cùng một ô, xuống dòng bằng <br>.
-->

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu xác định BrewLite **phải làm gì** (yêu cầu chức năng) và **phải đạt chất lượng nào** (yêu cầu phi chức năng) trong phiên bản bàn giao. Mỗi yêu cầu có mã định danh, mức ưu tiên MoSCoW và tiêu chí chấp nhận kiểm tra được, để nhóm dùng khi thiết kế, lập trình, viết test và lập ma trận truy vết ở các task sau.

### 1.2 Mức ưu tiên MoSCoW

*(Hùng điền)*

### 1.3 Thuật ngữ

| Thuật ngữ | Giải thích |
| --- | --- |
| Khách vãng lai | Người dùng chưa đăng nhập |
| Khách hàng | Người dùng đã đăng nhập với vai trò `CUSTOMER` |
| Nhân viên | Người dùng đã đăng nhập với vai trò `STAFF`, làm việc tại quầy |
| JWT | Chuỗi xác thực server cấp sau khi đăng nhập; web gửi kèm mỗi yêu cầu trong header `Authorization: Bearer <token>` |
| Idempotency-Key | Khóa do web tạo cho mỗi lần bấm thanh toán; gửi lại cùng khóa thì server trả lại giao dịch cũ, không tạo giao dịch mới |
| VNPay Sandbox | Môi trường thử của cổng thanh toán VNPay, dùng thẻ thử, không trừ tiền thật. Đây là dịch vụ thanh toán mô phỏng (Payment Service) của hệ thống |
| Ví / Thẻ | Hai phương thức thanh toán không dùng tiền mặt khách chọn ở Checkout: Ví (khách chọn cách trả trên trang VNPay) và Thẻ (thẻ ngân hàng nội địa) |
| Return URL | Trang VNPay chuyển khách về sau khi thanh toán, kèm kết quả có chữ ký |
| IPN | Yêu cầu VNPay gửi thẳng tới API để báo kết quả giao dịch, kèm chữ ký |
| Truy vấn giao dịch | Việc API hỏi lại VNPay kết quả thật của một giao dịch trước khi cập nhật đơn |
| Nguyên liệu | Thứ cửa hàng trữ trong kho (sữa, trà, cà phê…); tồn kho được tính theo nguyên liệu, không theo món |
| Công thức | Lượng từng nguyên liệu cần để pha một ly (tính cho size M) hoặc cho một phần topping |
| Số ly còn pha được | Số ly tối đa của một món còn pha được từ lượng nguyên liệu đang có |
| Đơn chờ | Đơn đã tạo nhưng chưa thanh toán thành công (`PENDING` hoặc `PAYMENT_FAILED`) |
| Transaction | Nhóm thao tác ghi CSDL hoặc cùng thành công, hoặc cùng bị hủy |
| Optimistic locking | Cách chống ghi đè khi nhiều yêu cầu cùng sửa một dòng dữ liệu: mỗi dòng có số phiên bản, ghi thất bại nếu phiên bản đã đổi thì thử lại |

### 1.4 Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| BR-01 | **Giá.** Đơn giá một ly = giá món + phụ thu size (S: 0đ, M: 5.000đ, L: 10.000đ) + tổng giá topping đã chọn. Thành tiền một dòng = đơn giá × số lượng. Tổng đơn = tổng thành tiền các dòng − số tiền giảm. |
| BR-02 | **Tính giá ở server.** Server luôn tính lại giá từ CSDL; web không gửi giá lên. Dữ liệu gửi lên có trường không được khai báo thì bị từ chối. |
| BR-03 | **Tồn kho theo nguyên liệu.** Lượng nguyên liệu cho một ly = công thức size M × hệ số size (S: 0,8; M: 1; L: 1,3), làm tròn lên; lượng của topping không đổi theo size. Số ly còn pha được = giá trị nhỏ nhất của (tồn kho ÷ lượng cần) trên các nguyên liệu của món. Món hiển thị "Hết món" khi không pha nổi 1 ly size S không topping. |
| BR-04 | **Trừ và trả kho.** Nguyên liệu bị trừ ngay khi tạo đơn, trong cùng transaction với việc tạo đơn, có optimistic locking. Không đủ nguyên liệu thì không tạo đơn, không trừ nguyên liệu nào. Đơn bị hủy thì trả lại đúng lượng đã trừ. |
| BR-05 | **Hạn thanh toán.** Đơn phải thanh toán thành công trong 5 phút kể từ khi tạo; thanh toán lại không được cộng thêm thời gian. Quá hạn thì hệ thống hỏi lại VNPay, chưa có tiền thì tự hủy đơn và trả kho. |
| BR-06 | **Một đơn chờ.** Mỗi khách giữ tối đa một đơn chờ. Đặt đơn mới thì đơn chờ cũ bị hủy và trả kho; nếu đơn mới không đủ nguyên liệu thì báo lỗi và giữ nguyên đơn cũ. |
| BR-07 | **Mã giảm giá.** Mã hợp lệ khi tồn tại, đang hoạt động, còn hạn và tạm tính đạt mức tối thiểu của mã. Có hai loại: giảm theo phần trăm tạm tính và giảm một số tiền cố định. Web kiểm tra trước, server kiểm tra lại khi tạo đơn. |
| BR-08 | **Điểm thưởng.** Số điểm = phần nguyên của (tổng đơn ÷ 10.000). Điểm được cộng một lần duy nhất khi đơn chuyển sang `PAID`. Hủy đơn đã `PAID` thì trừ lại đúng số điểm đã cộng, số dư không âm. Phiên bản này chỉ tích điểm, chưa đổi điểm. |
| BR-09 | **Vòng đời đơn.** `PENDING → PAID → PREPARING → READY → COMPLETED`; `PENDING → PAYMENT_FAILED → PENDING` (thanh toán lại); hủy (`CANCELLED`) được từ `PENDING`, `PAYMENT_FAILED`, `PAID`. `COMPLETED` và `CANCELLED` là trạng thái kết thúc. Mọi chuyển tiếp khác bị chặn. |
| BR-10 | **Quyền đổi trạng thái.** `PAID` và `PAYMENT_FAILED` chỉ được đặt khi server đã xác minh kết quả thanh toán. Nhân viên chuyển `PAID → PREPARING → READY → COMPLETED` và chỉ hủy được đơn `PAID`. Khách hủy được đơn của mình ở `PENDING`, `PAYMENT_FAILED`, `PAID`. |
| BR-11 | **Đổi trạng thái đồng thời.** Hai yêu cầu cùng đổi trạng thái một đơn thì chỉ một yêu cầu thành công; yêu cầu còn lại bị từ chối vì trạng thái đã thay đổi. |
| BR-12 | **Thanh toán thành công.** Đơn chỉ thành `PAID` khi kết quả từ VNPay có chữ ký hợp lệ, đúng số tiền và được xác nhận khi truy vấn lại giao dịch. Cùng một kết quả gửi về nhiều lần chỉ cập nhật đơn và cộng điểm một lần. |
| BR-13 | **Hoàn tiền.** Hủy đơn đã `PAID` thì hệ thống gửi yêu cầu hoàn tiền tới VNPay; lỗi thì đơn ở tình trạng "Đang hoàn tiền" và tự thử lại định kỳ. Khách trả tiền cho đơn đã bị hủy thì đơn vẫn giữ hủy và được hoàn tiền. |
| BR-14 | **Doanh thu.** Chỉ tính các giao dịch thanh toán thành công của đơn không bị hủy, không bị hoàn tiền. |

## 2. Mô tả tổng quan

### 2.1 Tác nhân

*(Hùng điền)*

### 2.2 Môi trường vận hành

*(Hùng điền)*

## 3. Yêu cầu chức năng

### 3.1 Menu

Người phụ trách: Búp · Mã: FR-01 – FR-02

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-01 | *(Búp điền – chưa điền)* | | |

### 3.2 Chi tiết sản phẩm

Người phụ trách: Búp · Mã: FR-03

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-03 | *(Búp điền – chưa điền)* | | |

### 3.3 Giỏ hàng

Người phụ trách: Linh · Mã: FR-04 – FR-07 (gồm giỏ hàng, Checkout, mã giảm giá)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-04 | *(Linh điền – chưa điền)* | | |

### 3.4 Xác thực

Người phụ trách: Khoa · Mã: FR-08 – FR-09

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-08 | *(Khoa điền – chưa điền)* | | |

### 3.5 Đặt đơn

Người phụ trách: Quang · Mã: FR-10 – FR-13 (gồm tạo đơn, tồn kho, một đơn chờ, tự hủy đơn quá hạn)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-10 | *(Quang điền – chưa điền)* | | |

### 3.6 Thanh toán

Người phụ trách: Triệu · Mã: FR-14 – FR-18 (gồm VNPay Sandbox, idempotency, thanh toán thất bại, hoàn tiền, điểm thưởng)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-14 | *(Triệu điền – chưa điền)* | | |

### 3.7 Lịch sử đơn

Người phụ trách: Khoa · Mã: FR-19 – FR-20 (gồm xác nhận đơn, lịch sử và chi tiết đơn)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-19 | *(Khoa điền – chưa điền)* | | |

### 3.8 Quản lý trạng thái đơn

Người phụ trách: Quang · Mã: FR-21 – FR-24 (gồm vòng đời trạng thái, nhân viên đổi trạng thái, doanh thu, kho và nhập kho)

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| FR-21 | *(Quang điền – chưa điền)* | | |

### 3.9 Yêu cầu mở rộng và ngoài phạm vi

Người phụ trách: Hùng · Mã: FR-25 trở đi

*(Hùng điền)*

## 4. Yêu cầu phi chức năng

Người phụ trách: Búp · Mã: NFR-01 trở đi, đánh số liên tục qua các mục 4.1 – 4.4

### 4.1 Hiệu năng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-01 | *(Búp điền – chưa điền: thời gian phản hồi, đặt đơn đồng thời)* | | |

### 4.2 Bảo mật

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-xx | *(Búp điền – chưa điền: mật khẩu băm, JWT, phân quyền, validate hai phía, secret, HTTPS, database không public)* | | |

### 4.3 Tính khả dụng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-xx | *(Búp điền – chưa điền: luôn truy cập được và health check; dễ dùng: mobile-first, PWA, loading/empty/error, tương thích trình duyệt)* | | |

### 4.4 Khả năng triển khai

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-xx | *(Búp điền – chưa điền: Docker, migration/seed, CI/CD, rollback, ghi log)* | | |

## 5. Sơ đồ use-case tổng quát

Người phụ trách: Khoa

*(Khoa điền: ảnh `usecase-overview.svg`, tệp nguồn `usecase-overview.puml` và bảng use-case → yêu cầu)*

## 6. Quy ước mã kiểm thử

*(Hùng điền)*
