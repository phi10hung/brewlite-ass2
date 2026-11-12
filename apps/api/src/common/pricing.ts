// Phụ thu theo size (BR-01): S 0đ, M 5.000đ, L 10.000đ
export const SIZE_EXTRA = { S: 0, M: 5000, L: 10000 } as const;
export type Size = keyof typeof SIZE_EXTRA;

// Đơn giá một ly = giá món + phụ thu size + tổng giá topping (BR-01)
export function unitPrice(
  productPrice: number,
  size: Size,
  toppingPrices: number[],
): number {
  return (
    productPrice +
    SIZE_EXTRA[size] +
    toppingPrices.reduce((sum, price) => sum + price, 0)
  );
}

// 25000 → "25.000đ", dùng trong câu báo lỗi
export function formatVnd(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
