# BrewLite Web

Web Next.js của BrewLite, viết theo hướng mobile-first. Kiến trúc và lý do chọn: `docs/architecture/adr/002-frontend-nextjs-pwa.md`.

## Lệnh thường dùng

Chạy trong thư mục `apps/web`:

| Lệnh | Việc |
| --- | --- |
| `npm install` | Cài thư viện |
| `npm run dev` | Chạy web ở chế độ lập trình tại http://localhost:3000 |
| `npm run lint` | Kiểm tra code |
| `npm test` | Chạy test component (Vitest + React Testing Library) |
| `npm run build` | Build bản chạy thật |

Web gọi API tại `NEXT_PUBLIC_API_URL`; chưa khai báo thì dùng http://localhost:4000 (API chạy ở máy cá nhân). Muốn đổi thì tạo tệp `apps/web/.env.local` có dòng `NEXT_PUBLIC_API_URL=...`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/app` | Các trang (App Router) và layout chung |
| `src/components` | Component dùng chung: `Navbar`, `Footer` |
| `src/lib/api.ts` | Hàm `apiFetch` gọi API, báo lỗi bằng tiếng Việt |

Test đặt cạnh tệp được test, tên `*.test.tsx` hoặc `*.test.ts`, mã test `CT-xx` (SRS mục 6).