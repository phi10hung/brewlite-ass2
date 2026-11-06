# Ma trận truy vết – BrewLite

Liên kết mỗi yêu cầu chức năng trong phạm vi với use-case, thiết kế, mã nguồn và kiểm thử. Mã yêu cầu và use-case xem ở [srs.md](requirements/srs.md); mã kiểm thử đặt theo quy ước ở mục 6 của SRS. Các yêu cầu ngoài phạm vi (FR-25 – FR-32) không đưa vào ma trận.

Người phụ trách: Khoa

| Mã yêu cầu | Use-case | Thiết kế/Sơ đồ | Code/API | Test |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | | |
| FR-02 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | | |
| FR-03 | UC-01 Xem menu và chi tiết món | Activity-01, Class-01 | | |
| FR-04 | UC-02 Quản lý giỏ hàng | Activity-01 | | |
| FR-05 | UC-02 Quản lý giỏ hàng | Class-01 | | |
| FR-06 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-07 | UC-05 Áp dụng mã giảm giá | Activity-01, Sequence-01, Class-01 | | |
| FR-08 | UC-03 Đăng ký, đăng nhập | Activity-01, Class-01 | | |
| FR-09 | UC-03 Đăng ký, đăng nhập | Activity-01, Activity-02, Sequence-01, Class-01 | | |
| FR-10 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-11 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-12 | UC-04 Đặt và thanh toán đơn hàng | Class-01 | | |
| FR-13 | UC-11 Tự hủy đơn quá hạn | Activity-01, Class-01 | | |
| FR-14 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-15 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-16 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01, Class-01 | | |
| FR-17 | UC-07 Hủy đơn; UC-12 Thử lại hoàn tiền | Activity-02, Class-01 | | |
| FR-18 | UC-04 Đặt và thanh toán đơn hàng; UC-13 Xem điểm thưởng | Activity-01, Sequence-01, Class-01 | | |
| FR-19 | UC-04 Đặt và thanh toán đơn hàng | Activity-01, Sequence-01 | | |
| FR-20 | UC-06 Theo dõi đơn và lịch sử | Activity-01, Class-01 | | |
| FR-21 | UC-07 Hủy đơn; UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | | |
| FR-22 | UC-08 Xử lý đơn tại quầy | Activity-02, Class-01 | | |
| FR-23 | UC-09 Xem doanh thu | Class-01 | | |
| FR-24 | UC-10 Quản lý kho, nhập kho | Class-01 | | |

Cột Code/API và Test được điền ở Task 4 và Task 5.

## Mã sơ đồ thiết kế

| Mã | Sơ đồ | Tệp |
| --- | --- | --- |
| Activity-01 | Khách hàng đặt và thanh toán đơn hàng | [activity-01-dat-va-thanh-toan.puml](diagrams/activity-01-dat-va-thanh-toan.puml) |
| Activity-02 | Nhân viên xử lý đơn tại quầy | [activity-02-nhan-vien-xu-ly-don.puml](diagrams/activity-02-nhan-vien-xu-ly-don.puml) |
| Sequence-01 | Đặt và thanh toán đơn hàng (UC-04) | [sequence-checkout.puml](diagrams/sequence-checkout.puml) |
| Class-01 | Mô hình domain | [class-domain.puml](diagrams/class-domain.puml) |