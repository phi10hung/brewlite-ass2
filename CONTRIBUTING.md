# Quy trình làm việc – BrewLite

Tài liệu này quy định cách nhóm dùng nhánh, pull request (PR), lời nhắn commit và tiêu chí hoàn thành (Definition of Done). Mọi thành viên làm theo cùng một quy trình cho cả code lẫn tài liệu.

## 1. Chiến lược nhánh

| Nhánh | Mục đích | Cách cập nhật |
| --- | --- | --- |
| `main` | Bản phát hành, chạy trên production. Mỗi lần `main` thay đổi hoặc có tag `v*` thì pipeline CD triển khai | Chỉ nhận PR từ `develop` khi phát hành |
| `develop` | Nhánh tích hợp, nhánh mặc định của repo | Chỉ nhận PR từ các nhánh việc bên dưới |
| `feature/<tên>` | Chức năng mới | Tạo từ `develop` |
| `fix/<tên>` | Sửa lỗi | Tạo từ `develop` |
| `docs/<tên>` | Tài liệu: yêu cầu, sơ đồ, kiến trúc, README | Tạo từ `develop` |
| `test/<tên>` | Thêm hoặc sửa test | Tạo từ `develop` |
| `chore/<tên>` | Cấu hình, công cụ, hạ tầng (Docker, CI/CD) | Tạo từ `develop` |

- `main` và `develop` được bảo vệ: không push thẳng, chỉ merge qua PR.
- Tên nhánh viết thường, không dấu, nối bằng gạch ngang. Ví dụ: `feature/man-menu`, `fix/gio-hang-tong-tien`.
- **Mỗi issue một nhánh**, luôn tạo từ `develop` mới nhất.
- **Không xóa nhánh** sau khi merge, để giữ lịch sử làm việc.

## 2. Quy trình một việc

1. Nhận issue (có người phụ trách, label, milestone). Kéo issue sang cột **In Progress** trên board.
2. Tạo nhánh:
   ```powershell
   git switch develop
   git pull
   git switch -c feature/<tên>
   ```
3. Làm và commit nhỏ theo từng phần (mục 4).
4. Trước khi push, chạy lint, test, build của ứng dụng đã sửa (`apps/web` hoặc `apps/api`).
5. Push nhánh và mở PR vào `develop` theo mẫu (mục 3).
6. CI tự chạy. Người được phân công review đọc và Approve, hoặc góp ý.
7. Sửa theo góp ý bằng **commit mới**, không sửa lại các commit đã được review.
8. Merge bằng **Create a merge commit**. Issue tự đóng nhờ dòng `Closes #số` và chuyển sang cột **Done**.

## 3. Pull request

- **Base:** `develop`. **Tiêu đề:** theo quy ước commit, kèm mục của đề nếu có. Ví dụ: `feat: thêm màn hình menu (Task 4.3)`.
- **Mô tả** (đã có sẵn mẫu khi mở PR):
  - đã làm gì, cách kiểm tra;
  - mã test đã viết (UT, CT, API-T, INT-T, E2E-T, SMK) để điền ma trận truy vết;
  - `Closes #số`, hoặc `Liên quan #số` nếu issue chưa xong.
- **Thanh bên phải:** Assignees là người làm; Reviewers theo cặp; Labels; Milestone là Sprint đang làm.
- **Điều kiện merge:**
  - có ít nhất **1 Approve**;
  - **CI đạt** (Install → Lint → Unit Test → Build);
  - không có conflict.
- **Cặp review:** Quang ↔ Triệu, Khoa ↔ Linh, Búp ↔ Hùng.
  - PR của trưởng nhóm: người review Approve rồi merge.
  - PR của các bạn khác: trưởng nhóm duyệt cuối rồi merge.
- **Thay đổi tài liệu** (yêu cầu, sơ đồ, kiến trúc trong `docs/`) cũng đi qua PR, và mô tả PR ghi rõ **lý do thay đổi**.
- **Phát hành:** mở PR `develop` → `main`. Sau khi CD chạy thành công thì tạo tag `vX.Y.Z` kèm release notes.

## 4. Quy ước commit

Lời nhắn có dạng `<loại>: <mô tả bằng tiếng Việt>`. Mô tả viết thường, ngắn gọn, không có dấu chấm cuối câu.

| Loại | Dùng khi | Ví dụ |
| --- | --- | --- |
| `feat` | Thêm chức năng | `feat: thêm API lấy danh sách món` |
| `fix` | Sửa lỗi | `fix: sửa tổng tiền khi đổi size` |
| `docs` | Tài liệu | `docs: thêm ADR 001 cấu trúc monorepo` |
| `test` | Thêm hoặc sửa test | `test: thêm test component màn menu` |
| `refactor` | Sửa cấu trúc code, không đổi hành vi | `refactor: tách hàm tính giá ra service riêng` |
| `style` | Định dạng, giao diện, không đổi logic | `style: căn lề thẻ món trên điện thoại` |
| `chore` | Cấu hình, thư viện, công cụ | `chore: thêm .env.example liệt kê biến môi trường` |
| `ci` | Pipeline CI/CD | `ci: thêm workflow chạy lint, test, build` |

- Mỗi commit một thay đổi trọn vẹn. **Không dồn** nhiều phần việc vào một commit.
- Commit **đứng tên đúng người làm**. Kiểm tra bằng `git config user.name` và `git config user.email`.
- **Không commit:** tệp `.env`, khóa bí mật, `node_modules/`, thư mục build (`dist/`, `.next/`), thư mục `out/`.

## 5. Definition of Done

Một issue chỉ được coi là **xong** khi đạt đủ các điều sau:

- [ ] Đáp ứng tiêu chí của issue và tiêu chí chấp nhận của các mã yêu cầu (FR, NFR) liên quan trong `docs/requirements/srs.md`.
- [ ] Code đã merge vào `develop` qua PR, có ít nhất 1 Approve.
- [ ] CI đạt: lint, unit test, build đều thành công.
- [ ] Với việc có code: phần mới có test (unit test, test component hoặc integration test tùy phần), và test đạt.
- [ ] Với việc có nhận dữ liệu: dữ liệu đầu vào được kiểm tra ở phía mình làm (web hoặc API); thông báo lỗi bằng tiếng Việt.
- [ ] Với việc có giao diện: màn hình dùng được ở chiều rộng 375 px, có trạng thái đang tải, trống, lỗi.
- [ ] Không có khóa bí mật trong code hay log; biến môi trường mới đã thêm vào `.env.example`.
- [ ] Tài liệu liên quan đã cập nhật: README khi cách chạy thay đổi, `docs/` khi thiết kế thay đổi, mã test ghi trong mô tả PR để điền ma trận truy vết.
- [ ] Issue đã đóng và nằm ở cột **Done** trên board.
