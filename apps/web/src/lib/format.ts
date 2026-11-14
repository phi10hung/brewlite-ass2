// Định dạng số tiền để hiển thị, ví dụ 25000 → "25.000đ".
// Giá trong database là số nguyên (đồng), web chỉ định dạng, không tự tính giá (BR-02).
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

// Thời điểm theo giờ Việt Nam (GMT+7), ví dụ "10:05 13/11/2026".
// Tự cộng 7 giờ nên hiển thị giống nhau dù máy đặt múi giờ nào.
export function formatDateTime(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())} ${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}