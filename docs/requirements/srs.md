# Đặc tả yêu cầu phần mềm (SRS rút gọn) – BrewLite

Tài liệu của Task 1.2. Bối cảnh, stakeholder và phạm vi xem ở [context-and-scope.md](context-and-scope.md). Đặc tả chi tiết use-case trọng tâm xem ở [uc-04-dat-va-thanh-toan.md](uc-04-dat-va-thanh-toan.md).

<!--
Cách điền cho từng thành viên:
- Mỗi bạn chỉ sửa trong mục của mình (có ghi tên người phụ trách và dải mã).
- Thay dòng "chưa điền" bằng các dòng yêu cầu của mình, giữ nguyên tiêu đề mục và dòng tiêu đề bảng.
- Mức ưu tiên ghi theo bảng MoSCoW nhóm đã chốt; số liệu nghiệp vụ dẫn chiếu quy tắc BR-xx ở mục 1.4.
- Tiêu chí chấp nhận đánh số 1., 2., 3. trong cùng một ô, xuống dòng bằng <br>.
-->

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu xác định BrewLite **phải làm gì** (yêu cầu chức năng) và **phải đạt chất lượng nào** (yêu cầu phi chức năng) trong phiên bản bàn giao. Mỗi yêu cầu có mã định danh, mức ưu tiên MoSCoW và tiêu chí chấp nhận kiểm tra được, để nhóm dùng khi thiết kế, lập trình, viết test và lập ma trận truy vết ở các task sau.

### 1.2 Mức ưu tiên MoSCoW

| Mức | Ý nghĩa với BrewLite |
| --- | --- |
| **Must** | Bắt buộc có trong bản bàn giao; thiếu thì luồng xem menu → đặt đơn → thanh toán → theo dõi đơn không chạy được, hoặc không đạt yêu cầu bắt buộc của đề |
| **Should** | Quan trọng, làm trong Sprint 2; thiếu thì hệ thống vẫn dùng được nhưng kém đầy đủ |
| **Could** | Chỉ làm khi đã xong Must và Should |
| **Won't** | Không làm trong phiên bản này, ghi lại cho phiên bản sau |

Mức ưu tiên của từng yêu cầu ghi ở cột "Ưu tiên" trong các bảng ở mục 3 và 4.

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

| Tác nhân | Loại | Mô tả |
| --- | --- | --- |
| Khách vãng lai | Chính | Chưa đăng nhập; xem menu, xem chi tiết món, dùng giỏ hàng, đăng ký và đăng nhập |
| Khách hàng | Chính | Đã đăng nhập; làm được mọi việc của khách vãng lai, thêm đặt đơn, thanh toán, áp mã giảm giá, theo dõi và hủy đơn của mình |
| Nhân viên | Chính | Đã đăng nhập vai trò `STAFF`; xử lý đơn tại quầy, hủy đơn đã thanh toán, xem doanh thu, xem kho và nhập kho. Quản lý cửa hàng dùng tài khoản này để theo dõi doanh thu và tồn kho |
| VNPay Sandbox | Phụ (hệ thống bên ngoài) | Nhận yêu cầu thanh toán và hoàn tiền, trả kết quả có chữ ký, trả lời khi hệ thống truy vấn giao dịch |
| Bộ hẹn giờ hệ thống | Phụ (tự động) | Định kỳ tự hủy đơn quá hạn thanh toán và thử lại các lần hoàn tiền bị lỗi |

Quản lý cửa hàng là stakeholder (xem [context-and-scope.md](context-and-scope.md)), không phải tác nhân riêng: khi dùng hệ thống, quản lý đóng vai Nhân viên.

### 2.2 Môi trường vận hành

- Người dùng truy cập bằng trình duyệt trên điện thoại hoặc máy tính; web cài được dưới dạng PWA.
- Frontend Next.js gọi REST API (JSON) của backend NestJS; dữ liệu lưu trong PostgreSQL, thay đổi cấu trúc bằng migration.
- Thanh toán qua VNPay Sandbox.
- Ba môi trường: **local** (Docker Compose chạy web, API, database), **CI** (GitHub Actions), **production** (web trên Vercel; API chạy từ Docker image lưu trên GitHub Container Registry, triển khai trên Render; PostgreSQL trên Render). Chi tiết ở tài liệu kiến trúc.

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

### 3.9 Yêu cầu ngoài phạm vi

Người phụ trách: Hùng · Mã: FR-25 trở đi

| Mã | Yêu cầu | Ưu tiên | Ghi chú |
| --- | --- | --- | --- |
| FR-25 | Thêm, sửa món và giá | Won't | Là việc của quản lý, cần vai trò Quản lý riêng (FR-27); menu được nạp bằng dữ liệu seed |
| FR-26 | Quản lý mã giảm giá | Won't | Là việc của quản lý, cần vai trò Quản lý riêng (FR-27); mã giảm giá được nạp bằng dữ liệu seed |
| FR-27 | Vai trò Quản lý cửa hàng riêng | Won't | Quản lý dùng tài khoản Nhân viên để xem doanh thu và kho |
| FR-28 | Đổi điểm thưởng lấy ưu đãi | Won't | Phiên bản này chỉ tích điểm (BR-08) |
| FR-29 | Giao hàng tận nơi | Won't | Khách nhận đồ uống tại quầy |
| FR-30 | Thông báo đẩy khi đơn đổi trạng thái | Won't | Khách xem trạng thái ở trang đơn hàng |
| FR-31 | Nhiều chi nhánh | Won't | Hệ thống phục vụ một cửa hàng |
| FR-32 | Thanh toán bằng tiền thật | Won't | Chỉ dùng VNPay Sandbox |

## 4. Yêu cầu phi chức năng

Người phụ trách: Búp · Mã: NFR-01 trở đi, đánh số liên tục qua các mục 4.1 – 4.4

### 4.1 Hiệu năng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-01 | API phản hồi nhanh khi server đang chạy | Should | 1. Đo `GET /products` và `GET /products/:id` trên database có dữ liệu seed, khi server đã khởi động xong: ít nhất 95% yêu cầu phản hồi dưới 500 ms.<br>2. Không tính lần khởi động lại của gói miễn phí. |
| NFR-02 | Đặt đơn đồng thời không bán vượt kho | Must | 1. Gửi 20 yêu cầu đặt đơn cùng lúc cho món mà nguyên liệu chỉ đủ cho 3 ly: đúng 3 đơn được tạo, 17 yêu cầu còn lại bị từ chối với mã 409.<br>2. Sau thử nghiệm, tồn kho mọi nguyên liệu không âm và bằng tồn kho ban đầu trừ lượng của các đơn đã tạo (đúng BR-04). |
| NFR-03 | Tự mở rộng thêm server khi đông người dùng | Won't | Không làm trong phiên bản này; hệ thống chạy một bản API. |

### 4.2 Bảo mật

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-04 | Mật khẩu lưu dạng băm; JWT có thời hạn | Must | 1. Cột mật khẩu trong database không chứa mật khẩu gốc, và không API nào trả mật khẩu hoặc giá trị băm.<br>2. Token hết hạn bị từ chối với mã 401. |
| NFR-05 | Phân quyền theo vai trò | Must | 1. Gọi API cần đăng nhập mà thiếu token hoặc token sai trả 401.<br>2. Khách hàng gọi API dành cho Nhân viên trả 403. |
| NFR-06 | Kiểm tra dữ liệu ở cả web và server | Must | 1. Web hiển thị lỗi tiếng Việt ngay tại ô nhập sai, trước khi gửi lên server.<br>2. Server từ chối dữ liệu sai kiểu hoặc có trường không được khai báo, trả 400 (đúng BR-02). |
| NFR-07 | Khóa bí mật không nằm trong repo hay log CI | Must | 1. Tìm trong repo không thấy khóa VNPay, mật khẩu database hay khóa ký JWT; các giá trị này nằm trong biến môi trường và secret của CI.<br>2. Log của pipeline CI không in các giá trị đó. |
| NFR-08 | Production dùng HTTPS; database không public | Must | 1. Truy cập URL production bằng HTTP được chuyển sang HTTPS.<br>2. Không kết nối trực tiếp tới database production được từ máy ngoài hệ thống. |

### 4.3 Tính khả dụng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-09 | Có health check; URL production truy cập được | Must | 1. `GET /health` trả 200 khi API và database hoạt động bình thường.<br>2. URL production mở được trang menu khi nghiệm thu. |
| NFR-10 | Mobile-first | Must | 1. Ở màn hình rộng 375 px, các trang menu, chi tiết món, giỏ hàng, thanh toán không cuộn ngang và thao tác được bằng ngón tay. |
| NFR-11 | PWA cài được | Must | 1. Trình duyệt hỗ trợ cho phép cài ứng dụng lên màn hình chính điện thoại. |
| NFR-12 | Trạng thái loading, trống, lỗi bằng tiếng Việt | Must | 1. Mọi trang có dữ liệu đều có trạng thái đang tải, trống và lỗi.<br>2. Thông báo lỗi bằng tiếng Việt, không hiển thị mã lỗi thô của hệ thống. |
| NFR-13 | Chạy đúng trên các trình duyệt phổ biến | Should | 1. Luồng xem menu đến xác nhận đơn chạy đúng trên bản mới của Chrome, Edge, Firefox và Safari. |
| NFR-14 | PWA xem được menu khi mất mạng | Could | 1. Sau khi đã mở menu một lần, tắt mạng rồi mở lại vẫn xem được menu đã tải, kèm thông báo đang ngoại tuyến. |
| NFR-15 | Ứng dụng di động riêng (Android, iOS) | Won't | Không làm trong phiên bản này; dùng web PWA. |

### 4.4 Khả năng triển khai

| Mã | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| --- | --- | --- | --- |
| NFR-16 | Chạy local bằng một lệnh Docker Compose | Must | 1. Chạy `docker compose up` trên máy sạch dựng được web, API và database. |
| NFR-17 | Migration và seed tái tạo được database | Must | 1. Chạy migration và seed trên database trống tạo đủ cấu trúc và dữ liệu menu.<br>2. Chạy lại không báo lỗi. |
| NFR-18 | CI chạy trên mọi pull request | Must | 1. Mở pull request thì CI tự chạy lint, test và build.<br>2. CI lỗi thì không merge được vào nhánh chính. |
| NFR-19 | CD tự động triển khai và có cách rollback | Must | 1. Merge vào nhánh chính thì pipeline CD build image, triển khai và chạy smoke test.<br>2. Có cách quay lại bản trước khi triển khai lỗi; sau khi quay lại, `GET /health` trả 200. |
| NFR-20 | Ghi log mỗi yêu cầu | Must | 1. Log mỗi yêu cầu có phương thức, đường dẫn, mã trạng thái và thời gian xử lý.<br>2. Log không chứa mật khẩu hay token. |

## 5. Sơ đồ use-case tổng quát

Người phụ trách: Khoa

*(Khoa điền: ảnh `usecase-overview.svg` và tệp nguồn `usecase-overview.puml`)*

Danh sách use-case dùng chung (Khoa điền cột "Yêu cầu liên quan"):

| Mã | Use-case | Tác nhân | Yêu cầu liên quan |
| --- | --- | --- | --- |
| UC-01 | Xem menu và chi tiết món | Khách vãng lai, Khách hàng | |
| UC-02 | Quản lý giỏ hàng | Khách vãng lai, Khách hàng | |
| UC-03 | Đăng ký, đăng nhập | Khách vãng lai, Nhân viên | |
| UC-04 | Đặt và thanh toán đơn hàng | Khách hàng; VNPay Sandbox | |
| UC-05 | Áp dụng mã giảm giá | Khách hàng | |
| UC-06 | Theo dõi đơn và lịch sử | Khách hàng | |
| UC-07 | Hủy đơn | Khách hàng, Nhân viên; VNPay Sandbox | |
| UC-08 | Xử lý đơn tại quầy | Nhân viên | |
| UC-09 | Xem doanh thu | Nhân viên | |
| UC-10 | Quản lý kho, nhập kho | Nhân viên | |
| UC-11 | Tự hủy đơn quá hạn | Bộ hẹn giờ hệ thống; VNPay Sandbox | |
| UC-12 | Thử lại hoàn tiền | Bộ hẹn giờ hệ thống; VNPay Sandbox | |
| UC-13 | Xem điểm thưởng | Khách hàng | |

## 6. Quy ước mã kiểm thử

Các task sau đặt mã test theo bảng dưới và ghi vào ma trận truy vết. Vị trí thư mục chốt lại ở Task 4.

| Tiền tố | Loại kiểm thử | Vị trí dự kiến |
| --- | --- | --- |
| `UT-xx` | Unit test nghiệp vụ backend (tính giá, trạng thái đơn, tồn kho, mã giảm giá, điểm thưởng) | `apps/api/src/` |
| `CT-xx` | Test component giao diện | `apps/web/src/` |
| `API-Txx` | Test API (gọi endpoint, kiểm tra dữ liệu và mã lỗi trả về) | `apps/api/test/` |
| `INT-Txx` | Integration test luồng tạo đơn và thanh toán trên database thật | `tests/integration/` |
| `E2E-Txx` | End-to-end test trên trình duyệt, từ menu đến xác nhận đơn | `tests/e2e/` |
| `SMK-xx` | Smoke test sau khi triển khai production | Pipeline CD |
