import { Injectable, NotFoundException } from '@nestjs/common';
import { SIZE_EXTRA } from '../common/pricing.js';
import { groupBy, ingredientsForLine, maxCups } from '../common/recipe.js';
import type { CartLineDto } from '../orders/dto/create-order.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AvailabilityDto } from './dto/availability.dto.js';

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  imageUrl: true,
} as const;

const RECIPE_SELECT = {
  productId: true,
  ingredientId: true,
  amount: true,
} as const;

const TOPPING_RECIPE_SELECT = {
  toppingId: true,
  ingredientId: true,
  amount: true,
} as const;

function canMake(stock: Map<number, number>, needs: Map<number, number>) {
  for (const [ingredientId, amount] of needs) {
    if ((stock.get(ingredientId) ?? 0) < amount) return false;
  }
  return true;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadStock() {
    const rows = await this.prisma.ingredient.findMany({
      select: { id: true, stock: true },
    });
    return new Map(rows.map((r) => [r.id, r.stock]));
  }

  async findAll(category?: string) {
    const [products, recipes, stock] = await Promise.all([
      this.prisma.product.findMany({
        where: category ? { category } : undefined,
        orderBy: { id: 'asc' },
        select: PRODUCT_SELECT,
      }),
      this.prisma.recipe.findMany({ select: RECIPE_SELECT }),
      this.loadStock(),
    ]);
    const recipesByProduct = groupBy(recipes, (r) => r.productId);

    return products.map((product) => ({
      ...product,
      stock: maxCups(
        stock,
        ingredientsForLine(recipesByProduct.get(product.id) ?? [], [], 'S', 1),
      ),
    }));
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy món');
    }

    const [toppings, recipes, toppingRecipes, stock] = await Promise.all([
      this.prisma.topping.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.recipe.findMany({
        where: { productId: id },
        select: RECIPE_SELECT,
      }),
      this.prisma.toppingRecipe.findMany({ select: TOPPING_RECIPE_SELECT }),
      this.loadStock(),
    ]);
    const recipesByTopping = groupBy(toppingRecipes, (r) => r.toppingId);
    const sizes = Object.entries(SIZE_EXTRA).map(([size, extra]) => ({
      size,
      extra,
    }));

    return {
      ...product,
      stock: maxCups(stock, ingredientsForLine(recipes, [], 'S', 1)),
      sizes,
      toppings: toppings.map((topping) => ({
        ...topping,
        available: canMake(
          stock,
          ingredientsForLine(
            [],
            [recipesByTopping.get(topping.id) ?? []],
            'M',
            1,
          ),
        ),
      })),
    };
  }

  // POST /products/availability (FR-05): số ly tối đa dòng `line` được có,
  // sau khi trừ nguyên liệu của các dòng khác trong giỏ. Nguyên liệu dùng chung
  // giữa các món (kể cả topping) do server tính (BR-03).
  async availability(dto: AvailabilityDto) {
    const all = [...dto.items, dto.line];
    const productIds = [...new Set(all.map((i) => i.productId))];
    const toppingIds = [...new Set(all.flatMap((i) => i.toppingIds))];

    const [recipes, toppingRecipes, stock] = await Promise.all([
      this.prisma.recipe.findMany({
        where: { productId: { in: productIds } },
        select: RECIPE_SELECT,
      }),
      this.prisma.toppingRecipe.findMany({
        where: { toppingId: { in: toppingIds } },
        select: TOPPING_RECIPE_SELECT,
      }),
      this.loadStock(),
    ]);
    const recipesByProduct = groupBy(recipes, (r) => r.productId);
    const recipesByTopping = groupBy(toppingRecipes, (r) => r.toppingId);

    const needsOf = (line: CartLineDto, quantity: number) =>
      ingredientsForLine(
        recipesByProduct.get(line.productId) ?? [],
        [...new Set(line.toppingIds)].map(
          (id) => recipesByTopping.get(id) ?? [],
        ),
        line.size,
        quantity,
      );

    // Trừ nguyên liệu của các dòng khác (không để âm)
    const remaining = new Map(stock);
    for (const item of dto.items) {
      for (const [ingredientId, amount] of needsOf(item, item.quantity)) {
        remaining.set(
          ingredientId,
          Math.max(0, (remaining.get(ingredientId) ?? 0) - amount),
        );
      }
    }

    return { maxQuantity: maxCups(remaining, needsOf(dto.line, 1)) };
  }
}
