# Sprint 1 – Sprint Review và Sprint Retrospective

| Thông tin | Nội dung |
| --- | --- |
| Thời gian Sprint | 09/11/2026 – 10/11/2026 |
| Mục tiêu Sprint | Nền tảng kỹ thuật và MVP xem menu (milestone `Sprint 1`) |
| Buổi họp | 20h30 ngày 10/11/2026, Google Meet |
| Chủ trì | Huỳnh Tấn Phi Hùng |
| Thư ký | Huỳnh Nguyễn Đình Khoa |
| Người tham gia | Huỳnh Tấn Phi Hùng, Lương Tùng Quang, Đỗ Xuân Triệu, Huỳnh Nguyễn Đình Khoa, Nguyễn Lương Hồng Búp, Hồ Văn Linh (đủ 6 thành viên) |

## 1. Sprint Review

### 1.1 Mục tiêu

Hoàn thành Task 4 của đề: thiết lập repository, đưa tài liệu Task 1–3 vào `docs`, hiện thực MVP Sprint 1 (API `GET /products`, `GET /products/:id`; màn hình menu mobile-first có trạng thái loading, empty, error; dữ liệu seed; test API và component) và CI chặn merge khi lỗi.

### 1.2 Kết quả theo mục của đề

| Mục đề | Issue | Việc | Người làm | PR | Kết quả |
| --- | --- | --- | --- | --- | --- |
| 4.1 | #45 | Thiết lập repository: cấu trúc `apps/web`, `apps/api`, `docs`; `.gitignore`, `.env.example`, README; quy trình nhánh, PR, quy ước commit, Definition of Done; Product Backlog trên GitHub Projects | Hùng | #46 | Xong |
| 4.2 | #54 | Quản lý tài liệu Task 1–3: sơ đồ trắng đen, cập nhật ADR 003, 006, 008, kiến trúc, deployment diagram cho khớp hiện thực | Hùng | #85 | Xong |
| 4.3 | #47 | Khung NestJS, kiểm tra biến môi trường, `GET /health`, log JSON, Dockerfile, `docker-compose.yml` | Triệu | #78 | Xong |
| 4.3 | #48 | Khung Next.js, Navbar/Footer mobile-first, hàm gọi API dùng chung, Vitest + React Testing Library | Linh | #79 | Xong |
| 4.3 | #49 | Schema database theo Class-01, migration đầu tiên, seed dữ liệu mẫu (14 món, 9 topping, 22 nguyên liệu) | Quang | #81 | Xong |
| 4.3 | #50 | API `GET /products`, `GET /products/:id`, tính số ly còn pha được theo BR-03 | Quang | #82 | Xong |
| 4.3 | #51 | Màn hình Menu: lọc danh mục, nhãn "Hết món", loading/empty/error kèm "Thử lại" | Búp | #84 | Xong |
| 4.3 | #52 | PWA: manifest, biểu tượng, service worker, thông báo ngoại tuyến | Khoa | #83 | Xong |
| 4.4 | #53 | CI: Install → Lint → Unit Test → Build cho API và web; bật check bắt buộc trên `develop`, `main` | Khoa (pipeline), Hùng (cài đặt nhánh) | #80 | Xong |

Tổng: 9/9 issue phát triển của Sprint 1 đã xong, 8 PR đã merge sau review (39 commit). Tất cả nằm ở cột **Done** trên board.

### 1.3 Kiểm thử

Chạy trên `develop` sau khi merge PR #84:

| Loại | Mã | Số test | Kết quả |
| --- | --- | --- | --- |
| Unit test API (biến môi trường, health, seed, tính nguyên liệu theo công thức) | UT-01 – UT-06, UT-10 – UT-23 | 20 | Đạt |
| Test API (`/health`, `/products`, `/products/:id`) | API-T01 – API-T10 | 11 | Đạt |
| Test component web (Navbar, Footer, gọi API, Menu, Hết món, manifest, ngoại tuyến) | CT-01 – CT-08, CT-10 – CT-22 | 21 | Đạt |
| **Tổng** | | **52** | **Đạt** |

CI chạy trên mọi PR vào `develop`; PR chỉ merge được khi hai check `API (apps/api)` và `Web (apps/web)` đều đạt.

### 1.4 Demo

| # | Nội dung demo | Kết quả |
| --- | --- | --- |
| 1 | `docker compose up --build -d`: API và database chạy, `GET /health` trả `"status":"ok"` | Đạt |
| 2 | Mở trang chủ ở chiều rộng 375 px: 14 món chia theo 4 danh mục, không cuộn ngang | Đạt |
| 3 | Bấm lọc một danh mục, rồi "Tất cả" | Đạt |
| 4 | "Sinh tố bơ" có nhãn "Hết món" | Đạt |
| 5 | Tắt API (`docker compose stop api`), tải lại: báo lỗi tiếng Việt, bấm "Thử lại" sau khi bật lại API thì menu hiện | Đạt |
| 6 | Bản build (`npm run build`, `npm start`): DevTools → Application → Manifest không lỗi; tích Offline vẫn mở được trang, có thông báo ngoại tuyến | Đạt (Hùng chạy lại sau buổi họp) |
| 7 | Một PR trên GitHub có 2 check CI xanh | Đạt |

### 1.5 Góp ý trong buổi review

- Không có góp ý thêm.

### 1.6 Chuyển sang Sprint 2

- Không có việc nào của Sprint 1 bị dời.
- Theo kế hoạch Backlog, các phần sau thuộc Sprint 2: trang chi tiết món, nút "Thêm vào giỏ" bị khóa khi hết món (#60); `POST /products/availability` (#58); đăng nhập, đơn hàng, thanh toán và các phần còn lại (#56 – #77).