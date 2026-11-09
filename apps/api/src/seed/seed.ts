// Seed dùng upsert để chạy lại không tạo trùng, không xóa đơn hàng và không đặt lại tồn kho.
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  INGREDIENTS,
  PRODUCTS,
  PROMOTIONS,
  SAMPLE_PASSWORD,
  SAMPLE_USERS,
  TOPPINGS,
} from './seed-data.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu biến môi trường bắt buộc: DATABASE_URL');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedIngredients() {
  const ids = new Map<string, number>();
  for (const item of INGREDIENTS) {
    // Chỉ cập nhật đơn vị; tồn kho đã có thể thay đổi theo đơn và nhập kho.
    const ingredient = await prisma.ingredient.upsert({
      where: { name: item.name },
      update: { unit: item.unit },
      create: item,
    });
    ids.set(ingredient.name, ingredient.id);
  }
  return ids;
}

function ingredientId(ids: Map<string, number>, name: string) {
  const id = ids.get(name);
  if (id === undefined) {
    throw new Error(
      `Công thức dùng nguyên liệu không có trong danh sách: ${name}`,
    );
  }
  return id;
}

async function seedProducts(ids: Map<string, number>) {
  for (const { recipe, ...data } of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
    for (const line of recipe) {
      const key = {
        productId: product.id,
        ingredientId: ingredientId(ids, line.ingredient),
      };
      await prisma.recipe.upsert({
        where: { productId_ingredientId: key },
        update: { amount: line.amount },
        create: { ...key, amount: line.amount },
      });
    }
  }
}

async function seedToppings(ids: Map<string, number>) {
  for (const { recipe, ...data } of TOPPINGS) {
    const topping = await prisma.topping.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
    for (const line of recipe) {
      const key = {
        toppingId: topping.id,
        ingredientId: ingredientId(ids, line.ingredient),
      };
      await prisma.toppingRecipe.upsert({
        where: { toppingId_ingredientId: key },
        update: { amount: line.amount },
        create: { ...key, amount: line.amount },
      });
    }
  }
}

async function seedPromotions() {
  for (const promotion of PROMOTIONS) {
    await prisma.promotion.upsert({
      where: { code: promotion.code },
      update: promotion,
      create: promotion,
    });
  }
}

async function seedUsers() {
  // Mật khẩu chỉ lưu dạng băm (NFR-04).
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);
  for (const user of SAMPLE_USERS) {
    // Giữ nguyên mật khẩu và điểm thưởng của tài khoản đã tồn tại.
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }
}

async function main() {
  const ids = await seedIngredients();
  await seedProducts(ids);
  await seedToppings(ids);
  await seedPromotions();
  await seedUsers();
  console.log(
    `Đã nạp dữ liệu mẫu: ${PRODUCTS.length} món, ${TOPPINGS.length} topping, ` +
      `${INGREDIENTS.length} nguyên liệu, ${PROMOTIONS.length} mã giảm giá, ${SAMPLE_USERS.length} tài khoản`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
