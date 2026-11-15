# Sprint 2 – Sprint Review và Sprint Retrospective

| Thông tin | Nội dung |
| --- | --- |
| Thời gian Sprint | 11/11/2026 – 15/11/2026 |
| Mục tiêu Sprint | Hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai một phiên bản production truy cập được (milestone `Sprint 2`) |
| Buổi họp | 21h30 ngày 15/11/2026, Google Meet |
| Chủ trì | Huỳnh Tấn Phi Hùng |
| Thư ký | Huỳnh Nguyễn Đình Khoa |
| Người tham gia | Huỳnh Tấn Phi Hùng, Lương Tùng Quang, Đỗ Xuân Triệu, Huỳnh Nguyễn Đình Khoa, Nguyễn Lương Hồng Búp, Hồ Văn Linh (đủ 6 thành viên) |

## 1. Sprint Review

### 1.1 Mục tiêu

Hoàn thành Task 5 của đề: hiện thực các chức năng còn lại của MVP (5.1), integration test và end-to-end test (5.2), pipeline CD từ Push/Tag tới Smoke Test (5.3), triển khai production và bàn giao (5.4); hoàn thiện ma trận truy vết (mục 8).

### 1.2 Kết quả theo mục của đề

| Mục đề | Issue | Việc | Người làm | PR | Kết quả |
| --- | --- | --- | --- | --- | --- |
| 5.1 | #56 | API đăng ký, đăng nhập, JWT, phân quyền Khách hàng, Nhân viên | Hùng | #87 | Xong |
| 5.1 | #60 | Màn chi tiết món: size, topping, số lượng, thêm vào giỏ | Búp | #88 | Xong |
| 5.1 | #62 | Giỏ hàng, tổng tiền, cảnh báo vượt kho, Checkout, mã giảm giá | Linh | #89, #106 | Xong |
| 5.1 | #63 | Màn đăng ký, đăng nhập, giữ phiên, đăng xuất | Khoa | #92 | Xong |
| 5.1 | #58 | API tạo đơn, trừ kho trong transaction (optimistic locking), tự hủy đơn quá hạn, xem đơn, đổi trạng thái | Quang | #94 | Xong |
| 5.1 | #57 | API doanh thu, kho nguyên liệu, nhập kho | Hùng | #97 | Xong |
| 5.1 | #59 | Thanh toán VNPay Sandbox Ví/Thẻ, idempotency, hoàn tiền, mã giảm giá, điểm thưởng | Triệu | #98 | Xong |
| 5.1 | #61 | Trang nhân viên: xử lý đơn tại quầy, hủy đơn, doanh thu, kho, nhập kho | Búp | #102 | Xong |
| 5.1 | #64 | Trang kết quả thanh toán, lịch sử và chi tiết đơn, hủy đơn, điểm thưởng | Khoa | #107 | Xong |
| 5.1 | #100 | Sửa lỗi: đơn không tự hủy khi VNPay Sandbox trả mã 99 lúc truy vấn lại | Triệu | #104 | Xong |
| 5.1 | #112 | Sửa lỗi: trang chi tiết món hiện số ly còn theo size, topping đang chọn | Hùng | #113 | Xong |
| 5.2 | #68 | Migration và seed tạo lại được database; CI kiểm tra trên database trống | Quang | #90 | Xong |
| 5.2 | #69 | `docker-compose.yml` chạy web, API, database bằng một lệnh | Triệu | #91 | Xong |
| 5.2 | #65 | Integration test API tạo đơn với PostgreSQL thật | Quang | #96 | Xong |
| 5.2 | #66 | Integration test API thanh toán với PostgreSQL thật | Triệu | #105 | Xong |
| 5.2 | #67 | End-to-end test từ menu đến xác nhận đơn (Playwright, 3 trình duyệt) | Búp | #108 | Xong |
| 5.3 | #70 | Pipeline CD: Lint, Test, Build → Docker Image → Push Registry → Deploy → Smoke Test; rollback | Linh | #93, #99 | Xong |
| 5.3 | #71 | Tài liệu triển khai `docs/deployment.md` | Quang | #103 | Xong |
| 5.4 | #72 | Tài khoản Vercel, Render, database production, secret | Hùng | – (cấu hình trên Vercel, Render, GitHub) | Xong |
| 5.4 | #73 | README: chạy local, test, build, triển khai, rollback, URL production | Hùng | #109 | Xong |
| 5.4 | #74 | Tag `v1.0.0` và release notes | Quang | – (tag, GitHub Release) | Xong |
| 5.4 | #75 | Video demo luồng end-to-end | Búp | – | #75 (đang làm) |
| 5.4 | #76 | Sprint Review và Sprint Retrospective Sprint 2 | Khoa | Biên bản này | Xong |
| 8 | #77 | Ma trận truy vết hoàn chỉnh FR-01 – FR-24 | Khoa | #110 | Xong |

Tổng: 22 PR vào `develop` đã merge sau review (114 commit), 4 lần merge `develop` vào `main` để triển khai (PR #95, #101, #111, #114). Các issue trên đã đóng, trừ #75 (đang làm); #76 đóng khi biên bản này được merge.

### 1.3 Triển khai production

| Lần | PR | Kết quả |
| --- | --- | --- |
| 1 | #95 | Đạt tới Deploy API; Deploy web bị Vercel chặn vì email người tạo commit merge không khớp tài khoản. Sửa ở PR #99 |
| 2 | #101 | Đủ các job xanh, Smoke Test đạt (`504ae77`). Thử rollback API về `d167232` rồi triển khai lại `504ae77`: đạt |
| 3 | #111 | Đủ các job xanh, Smoke Test đạt (`c27c8b8`) |
| 4 | #114 | Đủ các job xanh, Smoke Test đạt (`5c5eb71`) |
| Tag `v1.0.0` | – | CD chạy lại cho tag, đạt; image `ghcr.io/phi10hung/brewlite-api:v1.0.0`; GitHub Release "BrewLite v1.0.0" |

Production: web https://brewlite-smoky.vercel.app, API https://brewlite-api-4ibh.onrender.com, health check `/health` trả `version` `5c5eb71`.

### 1.4 Kiểm thử

Chạy trên `main` bản `5c5eb71` (v1.0.0):

| Loại | Mã | Số test | Kết quả |
| --- | --- | --- | --- |
| Unit test API | UT | 77 | Đạt |
| Test API qua HTTP | API-T | 33 | Đạt |
| Test component, luồng màn hình web | CT | 86 | Đạt |
| Integration test với PostgreSQL thật | INT-T01 – INT-T13 | 13 | Đạt |
| End-to-end test (Chromium, WebKit, Firefox) | E2E-T01, E2E-T02 | 6 | Đạt |
| **Tổng** | | **215** | **Đạt** |

So với cuối Sprint 1 (52 test), Sprint 2 thêm 163 test. PR chỉ merge được khi đủ 5 check bắt buộc: `API (apps/api)`, `Web (apps/web)`, `Database (migration, seed)`, `Integration test (tests/integration)`, `E2E test (tests/e2e)`. Mỗi lần triển khai, CD chạy smoke test SMK-01, SMK-02. Mã test của từng yêu cầu xem [ma trận truy vết](../traceability-matrix.md).

### 1.5 Demo trên production

| # | Nội dung demo | Kết quả |
| --- | --- | --- |
| 1 | Mở `/health`: `status` ok, `database` up, `version` `5c5eb71` | Đạt |
| 2 | Trên điện thoại: menu, lọc danh mục, nhãn "Hết món" | Đạt |
| 3 | Chi tiết Cà phê sữa đá: đổi size S, M, L thì "Còn X ly" giảm dần; thêm topping thì giá tăng | Đạt |
| 4 | Giỏ hàng: sửa số lượng, tổng tiền; vượt số ly còn thì báo đỏ, khóa thanh toán | Đạt |
| 5 | Chưa đăng nhập bấm thanh toán thì chuyển tới đăng nhập, xong quay lại Checkout; áp mã `GIAM10` | Đạt |
| 6 | Thanh toán VNPay Sandbox thành công: mã đơn, giỏ trống, cộng điểm thưởng, đơn "Đã thanh toán" | Đạt |
| 7 | Nhân viên: Nhận đơn → Pha xong → Giao khách; khách thấy đơn "Hoàn thành" trong lịch sử | Đạt |
| 8 | Hủy giao dịch ở VNPay: báo thất bại, giữ giỏ; Thanh toán tiếp thành công | Đạt |
| 9 | Nhân viên xem doanh thu; nhập kho thì số ly còn của món tăng | Đạt |
| 10 | GitHub: lần chạy CD đủ dấu xanh; Release v1.0.0 | Đạt |
| 11 | Video demo luồng end-to-end (#75) | #75 (đang làm) |

### 1.6 Góp ý trong buổi review

- Không có góp ý thêm.

### 1.7 Việc chưa làm

- Không có việc nào trong phạm vi bị dời.
- Các mục Won't trong SRS (vai trò Quản lý, sửa món và giá, quản lý mã giảm giá, đổi điểm, giao hàng, thông báo đẩy, nhiều chi nhánh, tiền thật) không làm, đúng phạm vi đã chốt.