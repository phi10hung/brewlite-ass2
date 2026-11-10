import { Injectable, NotFoundException } from '@nestjs/common';
import { SIZE_EXTRA } from '../common/pricing.js';
import { groupBy, ingredientsForLine, maxCups } from '../common/recipe.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
        ingredientsForLine(
          recipesByProduct.get(product.id) ?? [],
          [],
          'S',
          1,
        ),
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
}
