import { Role } from '../generated/prisma/enums.js';
import {
  INGREDIENTS,
  PRODUCTS,
  PROMOTIONS,
  SAMPLE_USERS,
  TOPPINGS,
} from './seed-data.js';

const ingredientNames = new Set(INGREDIENTS.map((item) => item.name));
const allRecipeLines = [...PRODUCTS, ...TOPPINGS].flatMap(
  (item) => item.recipe,
);

function hasDuplicate(values: string[]) {
  return new Set(values).size !== values.length;
}

describe('Dữ liệu seed (UT-10 – UT-13)', () => {
  it('có đủ 14 món, 9 topping và tài khoản Khách hàng, Nhân viên', () => {
    expect(PRODUCTS).toHaveLength(14);
    expect(TOPPINGS).toHaveLength(9);
    expect(SAMPLE_USERS.map((user) => user.role)).toEqual(
      expect.arrayContaining([Role.CUSTOMER, Role.STAFF]),
    );
  });

  it('mỗi món, mỗi topping có giá dương và có công thức', () => {
    for (const item of [...PRODUCTS, ...TOPPINGS]) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.recipe.length).toBeGreaterThan(0);
    }
  });

  it('công thức chỉ dùng nguyên liệu có trong danh sách, lượng là số nguyên dương', () => {
    for (const line of allRecipeLines) {
      expect(ingredientNames.has(line.ingredient)).toBe(true);
      expect(Number.isInteger(line.amount) && line.amount > 0).toBe(true);
    }
  });

  it('không trùng tên món, topping, nguyên liệu, mã giảm giá, email (khóa của upsert)', () => {
    expect(hasDuplicate(PRODUCTS.map((item) => item.name))).toBe(false);
    expect(hasDuplicate(TOPPINGS.map((item) => item.name))).toBe(false);
    expect(hasDuplicate(INGREDIENTS.map((item) => item.name))).toBe(false);
    expect(hasDuplicate(PROMOTIONS.map((item) => item.code))).toBe(false);
    expect(hasDuplicate(SAMPLE_USERS.map((user) => user.email))).toBe(false);
  });
});
