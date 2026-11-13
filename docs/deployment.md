# Triển khai production

Tài liệu này mô tả BrewLite đang chạy ở đâu, pipeline CD triển khai thế nào, cấu hình và secret đặt ở đâu, cách kiểm tra sau triển khai và cách rollback. Lý do chọn nền tảng: [ADR 008](architecture/adr/008-nen-tang-trien-khai.md). Sơ đồ: [deployment diagram](architecture/deployment-diagram.svg).

## 1. Địa chỉ production

| Thành phần | Địa chỉ | Nền tảng |
| --- | --- | --- |
| Web (Next.js, PWA) | https://brewlite-smoky.vercel.app | Vercel, project `brewlite` |
| API (NestJS) | https://brewlite-api-4ibh.onrender.com | Render Web Service `brewlite-api`, vùng Singapore |
| Health check | https://brewlite-api-4ibh.onrender.com/health | Render gọi đường dẫn này để biết bản mới đã chạy được chưa |
| Database | Không có địa chỉ công khai | Render PostgreSQL 16 `brewlite-db`, chỉ API kết nối được qua Internal URL |
| Image API | `ghcr.io/phi10hung/brewlite-api:<mã commit>` | GitHub Container Registry, package private |

Web và API đều chạy HTTPS; gõ `http://` sẽ được chuyển sang `https://`. Tài khoản mẫu: `khach@brewlite.vn` (Khách hàng), `staff@brewlite.vn` (Nhân viên), mật khẩu `123456`.

**Kiểm tra nhanh** (PowerShell):

```powershell
$api = "https://brewlite-api-4ibh.onrender.com"
Invoke-RestMethod "$api/health"
(Invoke-WebRequest "https://brewlite-smoky.vercel.app" -UseBasicParsing).StatusCode
```

`/health` phải trả `status: ok`, `database: up` và `version` là mã commit đang chạy (7 ký tự). Trang web phải trả `200`.

API dùng gói miễn phí của Render nên **ngủ sau 15 phút không có truy cập**; lần gọi đầu mất khoảng 1 phút. Trước khi demo, mở `/health` trước vài phút.

## 2. Pipeline CD

Tệp: [`.github/workflows/cd.yml`](../.github/workflows/cd.yml). Pipeline chạy khi:
- có commit mới trên `main` (merge PR từ `develop` vào `main`);
- tạo tag phiên bản dạng `v*`, ví dụ `v1.0.0`;
- chạy tay **Run workflow** để rollback API (mục 6).

| Thứ tự | Job | Việc làm | Lỗi thì |
| --- | --- | --- | --- |
| 1 | Lint, Test, Build (API) và (web) | `npm ci`, `npm run lint`, `npm test`, `npm run build` cho `apps/api` và `apps/web`, chạy song song | Dừng, không build image |
| 2 | Docker Image, Push Registry | Build image API từ `apps/api/Dockerfile`, gắn tag mã commit (thêm tag phiên bản nếu là tag `v*`), ghi `APP_VERSION` = mã commit, push lên ghcr.io bằng `GITHUB_TOKEN` | Dừng, production giữ bản cũ |
| 3 | Deploy API (Render) | Gọi Render Deploy Hook kèm `imgURL` của image vừa push | Dừng, in cách rollback |
| 4 | Deploy web (Vercel) | `vercel pull` lấy cấu hình production, `vercel build --prod`, `vercel deploy --prebuilt --prod`; tối đa 15 phút | Dừng, in cách rollback |
| 5 | Smoke Test | Chạy `.github/scripts/smoke-test.sh` (mục 5) | Pipeline báo đỏ, in cách rollback |
| – | Hướng dẫn rollback | Chỉ chạy khi job 3, 4 hoặc 5 lỗi: in cách rollback API và web ngay trong log | – |

Mỗi lúc chỉ có một lần triển khai (`concurrency: production`); lần sau chờ lần trước xong.

**Migration an toàn.** Container API khởi động bằng `apps/api/docker-start.sh`: chạy `prisma migrate deploy`, nạp dữ liệu mẫu (seed dùng `upsert`, chạy lại không tạo trùng), rồi mới mở cổng. Migration lỗi thì container không chạy, `/health` không đạt, Render giữ bản cũ phục vụ khách. Migration của dự án chỉ thêm bảng, thêm cột, không xóa, nên bản API cũ vẫn chạy được trên database mới (ADR 003, ADR 008).

## 3. Cấu hình và secret

Giá trị thật **không ghi ở repo này**. Chỉ trưởng nhóm giữ giá trị; người khác chỉ cần biết tên (ADR 007). GitHub tự che giá trị secret bằng `***` trong log.

**GitHub** → repo → Settings → Secrets and variables → Actions:

| Tên | Loại | Dùng cho |
| --- | --- | --- |
| `RENDER_DEPLOY_HOOK_URL` | Secret | Job Deploy API và Rollback API gọi Render |
| `VERCEL_TOKEN` | Secret | Vercel CLI trong job Deploy web |
| `VERCEL_ORG_ID` | Secret | Tài khoản Vercel chứa project |
| `VERCEL_PROJECT_ID` | Secret | Project `brewlite` trên Vercel |
| `PRODUCTION_API_URL` | Variable | Địa chỉ API cho smoke test |
| `PRODUCTION_WEB_URL` | Variable | Địa chỉ web cho smoke test |

`GITHUB_TOKEN` do GitHub tự cấp cho mỗi lần chạy, dùng để push image lên ghcr.io.

**Render** → `brewlite-api` → Environment (biến của API):

| Tên | Bí mật | Ghi chú |
| --- | --- | --- |
| `NODE_ENV` | Không | `production` |
| `DATABASE_URL` | Có | Internal Database URL của `brewlite-db` |
| `JWT_SECRET` | Có | Chuỗi ngẫu nhiên dài, khác với máy cá nhân |
| `JWT_EXPIRES_IN` | Không | `1d` |
| `CORS_ORIGIN` | Không | Địa chỉ web production, không có `/` ở cuối |
| `ORDER_PAYMENT_MINUTES` | Không | `5` |
| `VNP_TMN_CODE`, `VNP_HASH_SECRET` | Có | Khóa VNPay Sandbox |
| `VNP_PAY_URL`, `VNP_API_URL` | Không | Địa chỉ Sandbox, giống `.env.example` |
| `VNP_RETURN_URL` | Không | `<địa chỉ web production>/payment/result` |

Không đặt `PORT` (Render tự đặt) và `APP_VERSION` (đã ghi vào image lúc build). Render kéo image private bằng thông tin đăng nhập registry `ghcr-brewlite` (token GitHub chỉ có quyền đọc package).

**Vercel** → project `brewlite` → Settings → Environment Variables: `NEXT_PUBLIC_API_URL` = địa chỉ API production (môi trường Production). Biến này được ghi vào bản build, trình duyệt đọc được, nên không bao giờ chứa khóa bí mật. Project không nối với Git: web chỉ được triển khai qua pipeline CD.

Thêm biến mới thì cập nhật đủ: `.env.example`, Render hoặc Vercel, và ghi rõ trong mô tả PR.

## 4. Triển khai một phiên bản mới

**Cách thường dùng: merge `develop` vào `main`.**
1. Trên GitHub tạo PR base `main` ← compare `develop`, chờ CI xanh, 1 người duyệt rồi merge bằng **Create a merge commit**. **Không xóa nhánh `develop`.**
2. Vào **Actions → CD**, mở lần chạy mới nhất (sự kiện `push`, nhánh `main`), chờ tất cả job xanh (khoảng 4 – 6 phút).
3. Kiểm tra như mục 1: `version` của `/health` phải trùng mã commit merge (`git log --oneline -1 origin/main`).

**Phát hành phiên bản có số** (ví dụ `v1.0.0`), sau khi `main` đã có đủ code:

```powershell
git switch main
git pull
git tag -a v1.0.0 -m "BrewLite v1.0.0"
git push origin v1.0.0
```

CD chạy lại toàn bộ pipeline; image có thêm tag `v1.0.0` trên ghcr.io. Release notes viết trên GitHub Releases, gắn với tag này.
