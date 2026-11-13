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
