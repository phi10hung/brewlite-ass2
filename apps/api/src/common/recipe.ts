// Hệ số công thức theo size: công thức của món tính cho size M
export const SIZE_FACTOR = { S: 0.8, M: 1, L: 1.3 } as const;
export type RecipeSize = keyof typeof SIZE_FACTOR;

export type RecipeLine = { ingredientId: number; amount: number };

// Lượng nguyên liệu cần cho quantity ly của một dòng giỏ hàng.
export function ingredientsForLine(
  recipe: RecipeLine[],
  toppingRecipes: RecipeLine[][],
  size: RecipeSize,
  quantity: number,
): Map<number, number> {
  const result = new Map<number, number>();
  const add = (ingredientId: number, amount: number) =>
    result.set(ingredientId, (result.get(ingredientId) ?? 0) + amount);

  for (const line of recipe) {
    const scaled = Math.round(line.amount * SIZE_FACTOR[size] * 100) / 100;
    add(line.ingredientId, Math.ceil(scaled));
  }
  for (const topping of toppingRecipes) {
    for (const line of topping) add(line.ingredientId, line.amount);
  }
  for (const [ingredientId, amount] of result) {
    result.set(ingredientId, amount * quantity);
  }
  return result;
}

// Số ly tối đa pha được; nếu không có công thức thì không thể xác định.
export function maxCups(
  stock: Map<number, number>,
  perCup: Map<number, number>,
): number {
  let max = Infinity;
  for (const [ingredientId, amount] of perCup) {
    if (amount <= 0) continue;
    max = Math.min(max, Math.floor((stock.get(ingredientId) ?? 0) / amount));
  }
  return Number.isFinite(max) ? max : 0;
}

export function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const groupKey = key(row);
    const list = map.get(groupKey) ?? [];
    list.push(row);
    map.set(groupKey, list);
  }
  return map;
}
