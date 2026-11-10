// Phụ thu theo size (BR-01): S 0đ, M 5.000đ, L 10.000đ
export const SIZE_EXTRA = { S: 0, M: 5000, L: 10000 } as const;
export type Size = keyof typeof SIZE_EXTRA;
