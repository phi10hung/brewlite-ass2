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

*(Hùng điền)*

### 1.2 Mức ưu tiên MoSCoW

*(Hùng điền)*

### 1.3 Thuật ngữ

*(Hùng điền)*

### 1.4 Quy tắc nghiệp vụ

*(Hùng điền)*

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
