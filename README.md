# BrewLite

Ứng dụng đặt đồ uống không dùng tiền mặt. Khách hàng xem menu, chọn size và topping, đặt đơn và thanh toán bằng Ví hoặc Thẻ ngay trên điện thoại. Nhân viên theo dõi và xử lý đơn tại quầy.

Đồ án môn Công nghệ Phần mềm – Trường Đại học Sài Gòn, học kỳ I năm học 2026–2027, Nhóm 12.

## Luồng nghiệp vụ chính

Xem menu → Chọn size, topping → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn

## Dùng thử bản production

| Phần | Địa chỉ |
| --- | --- |
| Web (mở trên điện thoại hoặc máy tính) | https://brewlite-smoky.vercel.app |
| API | https://brewlite-api-4ibh.onrender.com |
| Health check | https://brewlite-api-4ibh.onrender.com/health |

Tài khoản mẫu, mật khẩu đều là `123456`:

| Tài khoản | Vai trò | Dùng thử |
| --- | --- | --- |
| `khach@brewlite.vn` | Khách hàng | Đặt đơn, thanh toán, xem lịch sử đơn, điểm thưởng (hoặc tự đăng ký tài khoản mới) |
| `staff@brewlite.vn` | Nhân viên | Mục **Quầy**: nhận và xử lý đơn, xem doanh thu, kho, nhập kho |

- Health check trả `{"status":"ok","database":"up","version":"<mã commit>"}`: API và database đang chạy, `version` là mã commit của bản đang triển khai.
- API chạy trên Render gói miễn phí, tự ngủ khi lâu không dùng: lần mở đầu tiên có thể mất **khoảng 1 phút**, các lần sau nhanh.
- Thanh toán chạy trên **VNPay Sandbox** (môi trường thử, không trừ tiền thật). Thông tin thẻ thử của VNPay Sandbox nhóm gửi kèm khi nộp bài, không ghi trong repo.

Chi tiết triển khai: [docs/deployment.md](docs/deployment.md).

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
2. Mở `.env`, điền giá trị cần thiết (xem chú thích trong tệp). Giá trị mẫu có sẵn đủ để xem menu, đăng nhập, đặt đơn, dùng trang nhân viên. Riêng **thanh toán** cần khóa VNPay Sandbox `VNP_TMN_CODE`, `VNP_HASH_SECRET` (xin trưởng nhóm, chỉ điền vào `.env`, không commit); để trống thì bấm Thanh toán sẽ báo "Chưa cấu hình thanh toán VNPay".
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
4. Hoặc chạy API và web bằng npm (database vẫn chạy bằng Docker). Cửa sổ PowerShell thứ nhất, ở gốc repo:
   ```powershell
   docker compose stop api web
   docker compose up -d db
   cd apps/api
   npm install
   npm run db:setup
   npm run start:dev
   ```
   Cửa sổ thứ hai, ở gốc repo:
   ```powershell
   cd apps/web
   npm install
   npm run dev
   ```
   `npm run db:setup` tạo bảng và nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi). Web http://localhost:3000 gọi API http://localhost:4000; sửa code thì cả hai tự tải lại.

Nếu cổng 3000, 4000 hoặc 5432 đang bị chương trình khác dùng thì tắt chương trình đó trước.

## Chạy test và build

Cài thư viện trước (`npm install` trong `apps/api`, `apps/web` như bước 4 ở trên). Các lệnh chạy ở gốc repo:

| Loại (mã test) | Lệnh | Ghi chú |
| --- | --- | --- |
| Lint, unit test, test API (UT, API-T) | `cd apps/api; npm run lint; npm test` | Không cần database |
| Lint, test component web (CT) | `cd apps/web; npm run lint; npm test` | |
| Integration test (INT-T) | xem bên dưới | PostgreSQL thật, database test riêng |
| End-to-end test (E2E-T) | xem bên dưới | Trình duyệt thật, tự bật API, web và VNPay giả lập |
| Build | `cd apps/api; npm run build` và `cd apps/web; npm run build` | Hoặc build image: `docker compose build` |

**Integration test** (database test tên kết thúc bằng `_test`, tạo một lần):
```powershell
docker compose up -d db
docker compose exec db createdb -U brewlite brewlite_test
cd apps/api
$env:TEST_DATABASE_URL = "postgresql://brewlite:brewlite@localhost:5432/brewlite_test"
npm run test:integration
```
`createdb` báo `already exists` là database đã có, bỏ qua. Chi tiết: [apps/api/README.md](apps/api/README.md) mục Integration test.

**End-to-end test** (database riêng tên kết thúc bằng `_e2e`, tự tạo):
```powershell
docker compose up -d db
cd tests/e2e
npm install
npx playwright install chromium webkit firefox
$env:E2E_DATABASE_URL = "postgresql://brewlite:brewlite@localhost:5432/brewlite_e2e"
npm test
```
Mất khoảng 3 phút, đạt thì in `6 passed`. Chi tiết: [tests/e2e/README.md](tests/e2e/README.md).

Nếu `.env` đổi `POSTGRES_USER`, `POSTGRES_PASSWORD` khác `brewlite` thì sửa lệnh `createdb` và 2 chuỗi địa chỉ database ở trên cho khớp.

Trên GitHub, mọi pull request vào `develop`, `main` tự chạy 5 job CI (API, Web, Database, Integration test, E2E test); job nào lỗi thì không merge được.

## Triển khai và rollback

**Triển khai:** merge `develop` vào `main` (qua pull request). Pipeline CD (`.github/workflows/cd.yml`) tự chạy: Lint, Test, Build → build image API, đẩy lên GitHub Container Registry → Render chạy image mới → Vercel triển khai web → smoke test (SMK-01 `/health` đúng mã commit, SMK-02 trang chủ web trả 200). Gắn tag `v*` (ví dụ `v1.0.0`) trên `main` thì CD chạy lại và image có thêm tag phiên bản; release notes ở mục Releases của repo.

Kiểm tra sau khi triển khai, `version` phải trùng mã commit mới nhất của `main`:
```powershell
Invoke-RestMethod https://brewlite-api-4ibh.onrender.com/health
git fetch; git log --oneline -1 origin/main
```

**Rollback API** (bản mới chạy nhưng có lỗi): trên GitHub vào **Actions → CD → Run workflow**, ô **Use workflow from** chọn `main`, ô mã commit nhập 7 ký tự của bản chạy tốt trước đó, bấm **Run workflow**. Job Rollback API đưa image cũ lên Render rồi chạy smoke test; xanh là xong, `/health` trả `version` là mã vừa quay về.

**Rollback web:** vercel.com → project `brewlite` → Deployments → chọn bản trước → **Instant Rollback**. Database không rollback (migration chỉ thêm, bản API cũ vẫn chạy được).

Các bước chi tiết, secret, biến môi trường, sự cố thường gặp: [docs/deployment.md](docs/deployment.md).

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
