# ADR 001: Dùng một repo chung (monorepo) cho web, API và tài liệu

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

BrewLite gồm ba phần: web Next.js, API NestJS và tài liệu (SRS, sơ đồ, ADR). Nhóm có 6 người, làm trong 2 Sprint ngắn. Một chức năng như "Đặt và thanh toán đơn hàng" thường sửa cả web, API và tài liệu cùng lúc. Ma trận truy vết cần nối được yêu cầu → sơ đồ → code → test. CI phải chạy lint, test, build cho cả web và API trên mỗi pull request.

## Quyết định

Dùng **một repo** `brewlite-ass2` với cấu trúc:

```
brewlite-ass2/
├─ apps/
│  ├─ web/          ← Next.js (PWA), có package.json riêng
│  └─ api/          ← NestJS, Prisma, Dockerfile, có package.json riêng
├─ docs/            ← requirements/, diagrams/, architecture/, traceability-matrix.md, deployment.md
├─ tests/
│  ├─ integration/  ← integration test cho API tạo đơn, thanh toán
│  └─ e2e/          ← test end-to-end (Playwright)
├─ .github/workflows/  ← CI, CD
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

- Mỗi ứng dụng trong `apps/` **tự quản lý thư viện** bằng npm (`package.json` và `package-lock.json` riêng). Không dùng công cụ workspace (npm workspaces, Turborepo, Nx).
- CI chạy riêng cho từng ứng dụng theo thư mục (`apps/web`, `apps/api`).
- `tests/integration` dùng thư viện của `apps/api`; `tests/e2e` có `package.json` riêng cho Playwright.
- Một nhánh, một pull request có thể chứa thay đổi của cả web, API và tài liệu cho cùng một issue.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Monorepo, mỗi app tự quản lý thư viện** (chọn) | Một nơi cho code và tài liệu; một PR sửa được cả web, API, tài liệu; ma trận truy vết dẫn link trong cùng repo; cài đặt đơn giản, Dockerfile của API chỉ cần thư mục `apps/api` | Không dùng chung code giữa web và API (kiểu dữ liệu phải khai báo hai nơi); cài thư viện hai lần |
| Monorepo + npm workspaces / Turborepo | Dùng chung kiểu dữ liệu; cache build | Thêm công cụ mới cần học; Dockerfile và cấu hình Vercel phức tạp hơn vì lockfile nằm ở gốc |
| Hai repo riêng (web, API) | Tách quyền, tách pipeline rõ ràng | Một chức năng phải mở hai PR; tài liệu và ma trận truy vết phải dẫn qua hai repo; khó theo dõi tiến độ |

## Hệ quả

**Tích cực**
- Giảng viên và cả nhóm xem toàn bộ lịch sử (yêu cầu, thiết kế, code, test) ở một repo.
- Quy trình issue → nhánh → PR → review giữ nguyên cho mọi loại việc.
- Vercel chỉ cần trỏ vào `apps/web`; Docker image của API build từ `apps/api`.

**Tiêu cực, đánh đổi**
- Kiểu dữ liệu trả về từ API phải khai báo lại ở web; khi đổi API phải nhớ sửa cả hai bên. Bù lại bằng integration test và E2E test.
- CI phải cài thư viện hai lần, chạy lâu hơn một chút. Chấp nhận được vì dự án nhỏ.

## Liên quan

- Yêu cầu: NFR-16 (chạy local một lệnh), NFR-18 (CI trên mọi pull request).
- ADR 002 (frontend), ADR 003 (backend), ADR 008 (nền tảng triển khai).