# BrewLite

Ứng dụng đặt đồ uống không dùng tiền mặt. Khách hàng xem menu, chọn size và topping, đặt đơn và thanh toán bằng Ví hoặc Thẻ ngay trên điện thoại. Nhân viên theo dõi và xử lý đơn tại quầy.

Đồ án môn Công nghệ Phần mềm – Trường Đại học Sài Gòn, học kỳ I năm học 2026–2027, Nhóm 12.

## Luồng nghiệp vụ chính

Xem menu → Chọn size, topping → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn

## Công nghệ

| Phần | Công nghệ |
| --- | --- |
| Web (`apps/web`) | Next.js, TypeScript, Tailwind CSS, mobile-first, PWA |
| API (`apps/api`) | NestJS, Prisma |
| Database | PostgreSQL |
| Thanh toán | VNPay Sandbox (dịch vụ thanh toán mô phỏng, không trừ tiền thật) |
| Đóng gói, triển khai | Docker, GitHub Actions, Vercel (web), Render (API, database), GitHub Container Registry |

## Cấu trúc repo

```
brewlite-ass2/
├─ apps/
│  ├─ web/                 ← Next.js (mobile-first, PWA)
│  └─ api/                 ← NestJS
├─ docs/
│  ├─ requirements/        ← Task 1: bối cảnh, SRS, use-case
│  ├─ diagrams/            ← Task 2: activity, sequence, class diagram
│  ├─ architecture/        ← Task 3: kiến trúc C4, ADR, deployment diagram
│  ├─ traceability-matrix.md
│  └─ deployment.md        ← URL production, pipeline CD, secret, rollback
├─ tests/                  ← integration test, end-to-end test
├─ .github/                ← mẫu pull request, workflow CI/CD
├─ .env.example            ← danh sách biến môi trường
├─ CONTRIBUTING.md         ← quy trình nhánh, PR, commit, Definition of Done
└─ README.md
```

## Tài liệu

| Tài liệu | Đường dẫn |
| --- | --- |
| Bối cảnh, stakeholder, phạm vi | [docs/requirements/context-and-scope.md](docs/requirements/context-and-scope.md) |
| Đặc tả yêu cầu (SRS) | [docs/requirements/srs.md](docs/requirements/srs.md) |
| Đặc tả use-case Đặt và thanh toán đơn hàng | [docs/requirements/uc-04-dat-va-thanh-toan.md](docs/requirements/uc-04-dat-va-thanh-toan.md) |
| Sơ đồ activity, sequence, class | [docs/diagrams/](docs/diagrams/) |
| Kiến trúc và các ADR | [docs/architecture/architecture.md](docs/architecture/architecture.md) |
| Deployment diagram | [docs/architecture/deployment-diagram.svg](docs/architecture/deployment-diagram.svg) |
| Triển khai production, smoke test, rollback | [docs/deployment.md](docs/deployment.md) |
| Ma trận truy vết | [docs/traceability-matrix.md](docs/traceability-matrix.md) |
| Quy trình làm việc, Definition of Done | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Chạy ở máy cá nhân

Cần cài: Git, Node.js 24, Docker Desktop.

1. Clone repo và tạo tệp cấu hình:
   ```powershell
   git clone https://github.com/phi10hung/brewlite-ass2.git
   cd brewlite-ass2
   Copy-Item .env.example .env
   ```
2. Mở `.env`, điền giá trị cần thiết (xem chú thích trong tệp).
3. Chạy cả hệ thống (web, API, database) bằng Docker Compose:
   ```powershell
   docker compose up --build -d
   docker compose ps
   ```
   Lần đầu mất vài phút để build. Cả 3 dịch vụ `db`, `api`, `web` báo `healthy` là xong:
   - Web: http://localhost:3000 (màn Thực đơn)
   - API: http://localhost:4000/health, thấy `{"status":"ok","database":"up",...}`

   Container API tự chạy migration và nạp dữ liệu mẫu trước khi nhận yêu cầu. Sửa `NEXT_PUBLIC_API_URL` trong `.env` thì chạy lại lệnh trên (có `--build`), vì địa chỉ API được ghi vào bản build của web.
   Tắt bằng `docker compose stop`.
4. Hoặc chạy API bằng npm (database vẫn chạy bằng Docker):
   ```powershell
   docker compose up -d db
   cd apps/api
   npm install
   npm run start:dev
   ```

Nếu cổng 3000, 4000 hoặc 5432 đang bị chương trình khác dùng thì tắt chương trình đó trước.

Lệnh chạy test sẽ được bổ sung khi các phần đó hoàn thành.

## Tiến độ

| Giai đoạn | Nội dung | Milestone |
| --- | --- | --- |
| Task 1–3 | Yêu cầu, mô hình hóa, kiến trúc | Phân tích và thiết kế (Task 1–3) |
| Sprint 1 (Task 4) | Thiết lập repo, xem menu (API, màn hình), CI | Sprint 1 |
| Sprint 2 (Task 5) | Hoàn thiện đặt và thanh toán đơn, kiểm thử, CD, triển khai production | Sprint 2 |

Product Backlog và tình trạng từng việc xem trên GitHub Projects của repo.

## Thành viên

| Họ tên | MSSV | GitHub |
| --- | --- | --- |
| Huỳnh Tấn Phi Hùng (trưởng nhóm) | 3124720026 | [@phi10hung](https://github.com/phi10hung) |
| Lương Tùng Quang | 3124720057 | [@quang-2703](https://github.com/quang-2703) |
| Đỗ Xuân Triệu | 3124720072 | [@10tothepowerof6](https://github.com/10tothepowerof6) |
| Huỳnh Nguyễn Đình Khoa | 3124410157 | [@dinhkhoa-lgtm](https://github.com/dinhkhoa-lgtm) |
| Nguyễn Lương Hồng Búp | 3124720009 | [@bupnguyen-19](https://github.com/bupnguyen-19) |
| Hồ Văn Linh | 3124410186 | [@linhho201006-bit](https://github.com/linhho201006-bit) |
