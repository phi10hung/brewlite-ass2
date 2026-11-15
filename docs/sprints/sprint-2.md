# Sprint 2 – Sprint Review và Sprint Retrospective

| Thông tin | Nội dung |
| --- | --- |
| Thời gian Sprint | 11/11/2026 – 15/11/2026 |
| Mục tiêu Sprint | Hoàn thành luồng end-to-end, tự động hóa đóng gói và triển khai một phiên bản production truy cập được (milestone `Sprint 2`) |
| Buổi họp | 14h ngày 15/11/2026, Google Meet |
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
| 5.4 | #75 | Video demo luồng end-to-end | Búp | [Video](https://drive.google.com/file/d/1WRk9YcV1bGhIfaJNDdV_naO4t6_KLiDY/view?usp=drive_link) | Xong |
| 5.4 | #76 | Sprint Review và Sprint Retrospective Sprint 2 | Khoa | Biên bản này | Xong |
| 8 | #77 | Ma trận truy vết hoàn chỉnh FR-01 – FR-24 | Khoa | #110 | Xong |

Tổng: 22 PR vào `develop` đã merge sau review (114 commit), 4 lần merge `develop` vào `main` để triển khai (PR #95, #101, #111, #114). Các issue trên đã đóng; #76 đóng khi biên bản này được merge.

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
| 11 | Video demo luồng end-to-end (#75): https://drive.google.com/file/d/1WRk9YcV1bGhIfaJNDdV_naO4t6_KLiDY/view?usp=drive_link | Đạt |

### 1.6 Góp ý trong buổi review

- Không có góp ý thêm.

### 1.7 Việc chưa làm

- Không có việc nào trong phạm vi bị dời.
- Các mục Won't trong SRS (vai trò Quản lý, sửa món và giá, quản lý mã giảm giá, đổi điểm, giao hàng, thông báo đẩy, nhiều chi nhánh, tiền thật) không làm, đúng phạm vi đã chốt.

## 2. Sprint Retrospective

### 2.1 Thực hiện hành động của Sprint 1

| # | Hành động | Kết quả trong Sprint 2 |
| --- | --- | --- |
| 1 | Tự kiểm tra đủ Reviewers, Assignees, Labels, Milestone, ảnh minh chứng, tích Definition of Done trước khi mở PR | Phần lớn PR mở là đủ; vẫn còn PR phải bổ sung ảnh sau khi review (#99, #102, #110) |
| 2 | `git pull` lấy `develop` mới nhất trước khi tạo nhánh | Phần lớn đạt; PR #88, #92 phải gộp `develop` mới vào nhánh vì làm song song với PR giỏ hàng #89 |
| 3 | Mở PR ngay trong ngày được giao | Đạt: 22 PR trong 5 ngày, việc chia theo đợt có hạn mở PR |
| 4 | Gửi việc buổi sáng, người review duyệt trong vòng nửa ngày | Đạt phần lớn; việc phụ thuộc nhau được chia đợt theo thứ tự (API trước, màn hình sau) |

### 2.2 Ý kiến từng thành viên

| Thành viên | Điều làm tốt | Điều cần cải thiện |
| --- | --- | --- |
| Hùng | Dựng môi trường production (Vercel, Render, database không public); bật đủ 5 check bắt buộc; README làm theo được trên một bản repo mới | Lỗi số ly còn không đổi theo size chỉ phát hiện khi thử trên điện thoại sau CD lần 3, phải sửa và triển khai thêm lần 4; mô tả PR #113 ghi nhầm số issue |
| Quang | API tạo đơn có optimistic locking, integration test 20 khách đặt cùng lúc; tài liệu triển khai; phát hành v1.0.0 | Bình luận đóng #74 lúc đầu chỉ có ảnh, phải bổ sung nội dung |
| Triệu | Thanh toán VNPay Sandbox chạy thật, idempotency, hoàn tiền; integration test thanh toán | Lỗi Sandbox trả mã 99 khi truy vấn lại chỉ lộ ra khi thử với Sandbox thật, phải sửa thêm (#104) và sửa BR-05, BR-12 cho khớp |
| Khoa | Màn đăng nhập, trang kết quả thanh toán và đơn hàng của khách; ma trận truy vết đủ FR-01 – FR-24 | PR #110 phải bổ sung ảnh minh chứng sau khi review |
| Búp | Màn chi tiết món, trang nhân viên; E2E test chạy trên 3 trình duyệt; video demo | PR #102 phải bổ sung ảnh minh chứng sau khi review |
| Linh | Giỏ hàng, Checkout; pipeline CD và thử rollback trên production | CD lần đầu bị Vercel chặn ở bước Deploy web, phải sửa ở PR #99 |

### 2.3 Tổng hợp

**Làm tốt**
- Xong toàn bộ việc trong phạm vi của Sprint 2; production truy cập được, phát hành v1.0.0.
- CI chặn merge bằng 5 check; mọi lần triển khai đều có smoke test, đã thử rollback thật.
- Test lớn dần theo chức năng (52 → 215 test), có integration test với database thật và E2E trên 3 trình duyệt.
- Đổi thiết kế thì sửa tài liệu trong cùng PR (BR-05, BR-12, FR-03), code khớp thiết kế.

**Cần cải thiện**
- Vài lỗi chỉ lộ ra khi chạy với dịch vụ thật (VNPay Sandbox, Vercel) hoặc khi thử trên điện thoại thật.
- Một số PR, issue vẫn phải bổ sung ảnh, nội dung sau khi mở.
- Tiêu chí chấp nhận chưa đủ rõ ở chi tiết (số ly còn theo size), nên test ban đầu không bắt được lỗi.

### 2.4 Bài học và hướng cải tiến

| # | Nội dung | Loại |
| --- | --- | --- |
| 1 | Trước mỗi lần triển khai, thử bằng tay cả luồng trên điện thoại (khổ 375 px) với bản sắp phát hành | Quy trình |
| 2 | Mỗi tiêu chí chấp nhận có ít nhất một test kiểm tra đúng tiêu chí đó, kể cả trường hợp đổi lựa chọn | Quy trình |
| 3 | Thử sớm với dịch vụ bên ngoài thật (cổng thanh toán, nền tảng triển khai) ngay khi có bản chạy được | Quy trình |
| 4 | Nút size ở trang chi tiết món báo trước size không đủ nguyên liệu | Sản phẩm |
| 5 | Nhân viên tạo đơn hộ khách tại quầy; báo cáo doanh thu theo ngày, tuần | Sản phẩm |
| 6 | Dùng gói trả phí hoặc giữ API không ngủ khi dùng thật; database có sao lưu định kỳ | Hạ tầng |