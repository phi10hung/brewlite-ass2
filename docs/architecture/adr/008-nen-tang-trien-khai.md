# ADR 008: Triển khai production trên Vercel (web), Render (API, PostgreSQL) và ghcr.io (image)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

BrewLite phải có URL production chạy được lúc nghiệm thu. Các yêu cầu cho môi trường production:

- dùng HTTPS, database không public (NFR-08);
- có `/health` (NFR-09);
- có CD tự động, có cách rollback (NFR-19);
- khóa bí mật không lộ trong repo hay log CI (NFR-07).

Đề yêu cầu pipeline: Lint, Test → Build → Docker Image (tag bằng SHA) → Push Registry → Deploy bằng secret của CI → migration an toàn → smoke test. Nhóm là sinh viên nên nền tảng phải **miễn phí**, không cần thẻ thanh toán. Repo đặt ở tài khoản cá nhân.

## Quyết định

**1. Nền tảng**

| Thành phần | Nền tảng | Ghi chú |
| --- | --- | --- |
| Web Next.js (PWA) | **Vercel** (gói Hobby) | Phân phối qua mạng CDN của Vercel, HTTPS tự động |
| API NestJS | **Render Web Service** chạy Docker image, vùng Singapore | HTTPS tự động, HTTP được chuyển sang HTTPS; Health Check Path = `/health` |
| Database | **Render PostgreSQL 16** (gói miễn phí), cùng vùng | Dữ liệu lưu trên ổ đĩa bền do Render quản lý; API kết nối bằng **Internal URL**; xóa hết IP trong danh sách cho phép, nên không kết nối được từ ngoài |
| Container registry | **GitHub Container Registry (ghcr.io)** | Image `ghcr.io/phi10hung/brewlite-api:<mã commit>`; Render kéo image bằng thông tin đăng nhập registry |
| CI/CD | **GitHub Actions** | Secret lưu trong GitHub Actions Secrets |

**2. Ranh giới môi trường**
- **Local:** Docker Compose dựng `web` (cổng 3000), `api` (4000), `db` (5432) trên máy cá nhân, đọc tệp `.env`.
- **CI:** GitHub Actions chạy khi mở PR (lint, test, build) và khi push lên `main` hoặc tạo tag `v*` (CD).
- **Production:** Vercel, Render và ghcr.io. Chỉ pipeline CD và trưởng nhóm được thay đổi.

**3. Pipeline CD** (chạy khi merge `develop` vào `main`, hoặc tạo tag `v*`)
1. **Lint, Test** cho web và API.
2. **Build** Docker image của API, ghi `APP_VERSION` = mã commit. Gắn tag bằng mã commit; nếu là tag phát hành thì thêm tag phiên bản (ví dụ `v1.0.0`).
3. **Push** image lên ghcr.io bằng `GITHUB_TOKEN`.
4. **Deploy API:** gọi Render Deploy Hook (secret `RENDER_DEPLOY_HOOK_URL`), kèm tham số `imgURL` trỏ tới image vừa push.
5. **Migration an toàn:**
   - Container chạy `prisma migrate deploy` trước khi mở cổng. Migration lỗi thì container không khởi động, Render không chuyển truy cập sang bản mới, bản cũ vẫn chạy.
   - Migration chỉ thêm, không xóa (ADR 003), nên bản API cũ vẫn chạy được trên database mới.
6. **Deploy web:** Vercel CLI build và triển khai `apps/web` (secret `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
7. **Smoke test:** gọi `GET <API>/health` đến khi nhận 200 với `version` đúng mã commit (tối đa 10 phút), rồi mở trang chủ web nhận 200. Hết thời gian hoặc sai thì **pipeline báo lỗi và dừng**.

**4. Rollback**
- **API:** chạy lại Deploy Hook với `imgURL` của mã commit trước đó (workflow chạy tay, nhập mã commit), hoặc bấm **Rollback** ở trang Deploys của Render.
- **Web:** dùng **Instant Rollback** của Vercel (trên trang web hoặc lệnh `vercel rollback`).
- Sau rollback, gọi `GET /health` phải trả 200 (NFR-19).
- Không rollback database. Migration chỉ thêm nên bản API cũ vẫn tương thích.

**5. Log:** log của API xem ở trang Logs của Render; log build và log chạy của web xem trên Vercel; log pipeline xem trên GitHub Actions. Secret của GitHub Actions tự được che bằng `***` trong log.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Vercel + Render + ghcr.io** (chọn) | Miễn phí, không cần thẻ; Vercel hỗ trợ Next.js tốt nhất, có CDN; Render chạy được Docker image, có health check, mạng nội bộ cho database; ghcr.io miễn phí và nằm cùng GitHub | API ngủ sau 15 phút không có truy cập, lần mở đầu chậm khoảng 1 phút; database miễn phí hết hạn sau 30 ngày, không có sao lưu; gói miễn phí không có bước chạy lệnh trước khi triển khai |
| Railway | Triển khai dễ, có database | Chỉ có tín dụng dùng thử, hết thì phải trả phí |
| Fly.io | Chạy Docker gần người dùng, có vùng châu Á | Cần thẻ thanh toán; cấu hình bằng dòng lệnh phức tạp hơn |
| VPS tự quản lý | Toàn quyền, không bị ngủ | Tốn phí; tự cài HTTPS, tường lửa, sao lưu, cập nhật bảo mật |
| Database Neon thay cho Render PostgreSQL | Gói miễn phí không hết hạn | Kết nối qua Internet công khai, khó đạt yêu cầu "database không public" ở gói miễn phí |
| Web cũng đặt trên Render | Chỉ dùng một nền tảng | Render cũng ngủ khi không có truy cập; không có CDN và tối ưu cho Next.js như Vercel |

## Hệ quả

**Tích cực**
- Có URL HTTPS cho web và API, database chỉ API truy cập được qua mạng nội bộ.
- Mỗi bản triển khai gắn với một mã commit cụ thể, nên biết chính xác đang chạy code nào và quay lại được bản trước.
- Triển khai lỗi (migration lỗi, health check không đạt, smoke test sai) thì bản cũ vẫn phục vụ và pipeline báo đỏ.

**Tiêu cực, đánh đổi**
- API ngủ khi không có truy cập. Trước buổi nghiệm thu cần mở `/health` trước vài phút. Yêu cầu tốc độ (NFR-01) không tính lần khởi động lại này.
- Database miễn phí hết hạn sau 30 ngày, không sao lưu. Nhóm tạo database gần ngày triển khai (khoảng 11/11). Muốn có lại dữ liệu mẫu thì chạy migration và seed.
- Dùng ba nền tảng nên secret nằm ở nhiều nơi. Chỉ trưởng nhóm giữ giá trị; các bạn khác chỉ dùng tên secret (ADR 007).
- Repo private nên image trên ghcr.io cũng private. Render cần thông tin đăng nhập registry (token chỉ có quyền đọc package).

## Liên quan

- Yêu cầu: NFR-01, NFR-07, NFR-08, NFR-09, NFR-16, NFR-19.
- Sơ đồ: `docs/architecture/deployment-diagram.puml`.
- ADR 003 (migration), ADR 006 (health check, log), ADR 007 (cấu hình, secret).
