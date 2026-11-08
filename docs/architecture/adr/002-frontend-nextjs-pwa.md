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