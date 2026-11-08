# ADR 004: Chống bán vượt kho bằng transaction và optimistic locking

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 08/11/2026

## Bối cảnh

Tồn kho tính theo **nguyên liệu**, không theo món (BR-03). Một đơn có thể dùng nhiều nguyên liệu, và nhiều món dùng chung một nguyên liệu (ví dụ sữa tươi). Giờ cao điểm, nhiều khách có thể đặt cùng lúc khi nguyên liệu chỉ còn đủ cho vài ly. Yêu cầu:
- Nguyên liệu bị trừ ngay khi tạo đơn, trong cùng transaction với việc tạo đơn. Không đủ thì không tạo đơn và không trừ nguyên liệu nào (BR-04).
- Gửi 20 yêu cầu cùng lúc khi nguyên liệu chỉ đủ 3 ly thì đúng 3 đơn được tạo, tồn kho không âm (NFR-02).
- Hai yêu cầu cùng đổi trạng thái một đơn thì chỉ một yêu cầu thành công (BR-11).

## Quyết định

**1. Trừ kho bằng optimistic locking trên cột `Ingredient.version`**, tất cả trong **một transaction** với việc tạo `Order`, `OrderItem`, `OrderIngredient`:

1. Tính lượng cần của từng nguyên liệu cho cả đơn (công thức size M × hệ số size, cộng lượng topping).
2. Xử lý nguyên liệu **theo thứ tự `ingredientId` tăng dần**, để mọi yêu cầu cập nhật theo cùng một thứ tự.
3. Với mỗi nguyên liệu: đọc `stock` và `version`. Nếu `stock` nhỏ hơn lượng cần thì hủy transaction, trả **400** "Món … không đủ nguyên liệu, chỉ còn pha được N ly" (FR-11).
4. Cập nhật có điều kiện:
   `UPDATE Ingredient SET stock = stock - lượng_cần, version = version + 1 WHERE id = ? AND version = version_đã_đọc`.
   Nếu không dòng nào được cập nhật, nghĩa là có yêu cầu khác vừa sửa nguyên liệu này. Khi đó hủy transaction và làm lại từ bước 3.
5. Thử lại **tối đa 10 lần**, mỗi lần chờ một khoảng ngẫu nhiên ngắn. Hết lượt thì trả **409** "Hệ thống đang bận, vui lòng đặt lại sau giây lát" (FR-11).
6. Lượng đã trừ lưu vào `OrderIngredient`. Khi hủy đơn thì trả lại đúng lượng này, cũng trong transaction.

**2. Đổi trạng thái đơn cũng theo kiểu điều kiện:** `UPDATE Order SET status = mới WHERE id = ? AND status = trạng_thái_lúc_đọc`. Không dòng nào được cập nhật thì trả **409** (BR-11).

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế |
| --- | --- | --- |
| **Optimistic locking (cột `version`)** (chọn) | Không giữ khóa lâu, đọc menu không bị chặn; làm được bằng Prisma, không cần SQL thô; dễ viết test mô phỏng đồng thời | Khi rất nhiều người tranh cùng nguyên liệu thì nhiều lần thử lại, có thể trả 409 |
| Khóa dòng `SELECT ... FOR UPDATE` (pessimistic) | Không phải thử lại; thứ tự rõ ràng | Prisma không hỗ trợ sẵn, phải viết SQL thô; yêu cầu sau phải chờ, dễ kẹt (deadlock) nếu khóa sai thứ tự |
| Một câu `UPDATE ... WHERE stock >= lượng_cần` | Đơn giản, mỗi nguyên liệu một câu lệnh | Đơn nhiều nguyên liệu vẫn phải gói trong transaction, khó báo đúng nguyên liệu nào thiếu |
| Transaction mức `SERIALIZABLE` | Database tự đảm bảo đúng | Lỗi tuần tự hóa xảy ra nhiều, vẫn phải thử lại; khó dự đoán |

## Hệ quả

**Tích cực**
- Không bán vượt kho, tồn kho không âm. Nếu thiếu nguyên liệu thì không trừ nguyên liệu nào.
- Xử lý theo thứ tự `ingredientId` nên không có hai yêu cầu chờ nhau vòng tròn.
- Dùng cùng một ý (cập nhật có điều kiện) cho cả tồn kho lẫn trạng thái đơn, dễ hiểu và dễ test.

**Tiêu cực, đánh đổi**
- Lúc cao điểm, một số khách nhận 409 và phải bấm đặt lại. Đây là đánh đổi chấp nhận được để không bán vượt kho (NFR-02 cho phép 409).
- Thời gian tạo đơn tăng lên khi phải thử lại. Giới hạn 10 lần giữ thời gian chờ ở mức ngắn.
- Nguyên liệu bị giữ ngay khi tạo đơn, kể cả khi khách chưa trả tiền. Vì vậy cần tự hủy đơn quá hạn 5 phút để trả kho (BR-05).

## Liên quan

- Yêu cầu: BR-03, BR-04, BR-05, BR-06, BR-11, NFR-02.
- Sơ đồ: `docs/diagrams/sequence-checkout.puml` (bước trừ kho trong transaction), `docs/diagrams/class-domain.puml` (`Ingredient.version`, `OrderIngredient`).
- ADR 003 (backend, Prisma).
