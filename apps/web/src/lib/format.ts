// Định dạng số tiền để hiển thị, ví dụ 25000 → "25.000đ".
// Giá trong database là số nguyên (đồng), web chỉ định dạng, không tự tính giá (BR-02).
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}
