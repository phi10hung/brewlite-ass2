# ADR 002: Frontend dùng Next.js, thiết kế mobile-first và cài được dạng PWA

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

Khách hàng của BrewLite chủ yếu đặt đồ uống bằng điện thoại khi đứng ở quầy hoặc trên đường tới quán. Hệ thống phải chạy tốt ở màn hình rộng 375 px (NFR-10), cài được lên màn hình chính như một ứng dụng (NFR-11), có trạng thái đang tải, trống, lỗi bằng tiếng Việt (NFR-12), và kiểm tra dữ liệu ngay trên web trước khi gửi (NFR-06). Nhóm không có thời gian làm thêm ứng dụng Android, iOS riêng (NFR-15 là Won't). Công nghệ frontend bắt buộc là Next.js.

## Quyết định

- **Next.js (App Router) + TypeScript**, mã nguồn trong `apps/web`.
- **Tailwind CSS**, viết giao diện theo hướng **mobile-first**: viết cho màn hình nhỏ trước, sau đó mới thêm kiểu cho màn hình rộng.
- **Gọi API NestJS trực tiếp từ trình duyệt** qua địa chỉ `NEXT_PUBLIC_API_URL` (ghi vào bản build). Web không truy cập database.
- **Giỏ hàng** lưu ở trình duyệt (Zustand + `localStorage`), nên tải lại trang không mất giỏ. Giá tiền cuối cùng luôn do server tính lại (BR-02).
- **PWA** dùng tính năng có sẵn của Next.js, không dùng thư viện PWA bên ngoài:
  - `app/manifest.ts` khai báo tên, màu, biểu tượng 192 px và 512 px, `display: standalone`;
  - `public/sw.js` là service worker tự viết, lưu tạm trang menu đã mở để xem lại khi mất mạng (NFR-14, mức Could).
- **Test frontend:** Vitest + React Testing Library cho test component; Playwright cho E2E (thư mục `tests/e2e`).
- **Triển khai** trên Vercel (chi tiết ở ADR 008).

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Next.js + PWA tự cấu hình** (chọn) | Đúng công nghệ bắt buộc; một mã nguồn chạy cả điện thoại và máy tính; cài được lên màn hình chính; Vercel hỗ trợ sẵn | Service worker phải tự viết và tự kiểm tra; PWA trên iOS bị giới hạn hơn Android |
| Next.js + thư viện `next-pwa` | Sinh service worker tự động | Thư viện ít được cập nhật, dễ lệch phiên bản với Next.js mới |
| Ứng dụng di động riêng (React Native) | Trải nghiệm gốc, truy cập được tính năng máy | Thêm một mã nguồn, phải phát hành qua kho ứng dụng; không kịp thời gian |
| React SPA (Vite) không dùng Next.js | Cấu hình nhẹ | Không đúng công nghệ bắt buộc của đề |

## Hệ quả

**Tích cực**
- Khách dùng được ngay trên trình duyệt điện thoại, không cần cài từ kho ứng dụng; muốn thì thêm vào màn hình chính.
- Một mã nguồn cho mọi màn hình, phù hợp nhóm nhỏ.
- Vitest chạy nhanh, dùng được trong bước Unit Test của CI.

**Tiêu cực, đánh đổi**
- Token đăng nhập lưu ở `localStorage` nên dễ bị đọc nếu web dính lỗi XSS. Nhóm chấp nhận vì cách này đơn giản và web, API nằm ở hai tên miền khác nhau. Để giảm rủi ro: không chèn HTML thô từ người dùng, token có thời hạn (NFR-04).
- `NEXT_PUBLIC_API_URL` được ghi vào lúc build. Đổi địa chỉ API thì phải build và triển khai lại web.
- Chế độ ngoại tuyến chỉ xem lại được menu đã tải, không đặt đơn được khi mất mạng.

## Liên quan

- Yêu cầu: NFR-06, NFR-10, NFR-11, NFR-12, NFR-13, NFR-14, NFR-15.
- ADR 001 (monorepo), ADR 008 (nền tảng triển khai).