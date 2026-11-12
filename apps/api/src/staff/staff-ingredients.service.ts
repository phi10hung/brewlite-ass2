import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Nguyên liệu "sắp hết" khi không còn đủ pha 10 ly (size M) của món hoặc topping
// dùng nguyên liệu đó nhiều nhất (FR-24)
export const LOW_STOCK_CUPS = 10;

const INGREDIENT_SELECT = {
  id: true,
  name: true,
  unit: true,
  stock: true,
} as const;

@Injectable()
export class StaffIngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lượng lớn nhất một ly (size M) cần của từng nguyên liệu, tính trên mọi món và topping
  private async maxPerCup(): Promise<Map<number, number>> {
    const [recipes, toppingRecipes] = await Promise.all([
      this.prisma.recipe.findMany({
        select: { ingredientId: true, amount: true },
      }),
      this.prisma.toppingRecipe.findMany({
        select: { ingredientId: true, amount: true },
      }),
    ]);
    const result = new Map<number, number>();
    for (const { ingredientId, amount } of [...recipes, ...toppingRecipes]) {
      result.set(ingredientId, Math.max(result.get(ingredientId) ?? 0, amount));
    }
    return result;
  }

  private withLowStock<T extends { id: number; stock: number }>(
    ingredient: T,
    perCup: Map<number, number>,
  ) {
    const need = (perCup.get(ingredient.id) ?? 0) * LOW_STOCK_CUPS;
    return { ...ingredient, lowStock: ingredient.stock < need };
  }

  // GET /staff/ingredients: tồn kho từng nguyên liệu, đánh dấu sắp hết (FR-24)
  async list() {
    const [ingredients, perCup] = await Promise.all([
      this.prisma.ingredient.findMany({
        orderBy: { name: 'asc' },
        select: INGREDIENT_SELECT,
      }),
      this.maxPerCup(),
    ]);
    return ingredients.map((i) => this.withLowStock(i, perCup));
  }

  // POST /staff/ingredients/:id/restock: chỉ cộng thêm (FR-24).
  // Tăng version để đơn đang tạo dở đọc lại tồn kho mới (ADR 004).
  async restock(id: number, amount: number) {
    const exists = await this.prisma.ingredient.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy nguyên liệu');
    }
    const [ingredient, perCup] = await Promise.all([
      this.prisma.ingredient.update({
        where: { id },
        data: { stock: { increment: amount }, version: { increment: 1 } },
        select: INGREDIENT_SELECT,
      }),
      this.maxPerCup(),
    ]);
    return this.withLowStock(ingredient, perCup);
  }
}
