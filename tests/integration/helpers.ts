import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { Role } from '../../apps/api/src/generated/prisma/enums.js';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service.js';
import {
  INGREDIENTS,
  SAMPLE_USERS,
} from '../../apps/api/src/seed/seed-data.js';

// Tồn kho theo dữ liệu mẫu: tên nguyên liệu → số lượng
export const SEED_STOCK: Record<string, number> = Object.fromEntries(
  INGREDIENTS.map((item) => [item.name, item.stock]),
);

export type TestApi = {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
  tokenOf: (user: { id: number; email: string; role: Role }) => string;
};

// Dựng API thật (đủ module, PrismaService thật) nối database test, nghe ở một cổng trống
export async function createTestApi(): Promise<TestApi> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  // Cùng cấu hình kiểm tra dữ liệu như apps/api/src/main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(0);
  // Tắt tác vụ định kỳ (tự hủy đơn quá hạn): test tự gọi đúng lúc cần
  const scheduler = app.get(SchedulerRegistry);
  for (const name of scheduler.getIntervals()) {
    scheduler.deleteInterval(name);
  }
  const jwt = app.get(JwtService);
  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
    tokenOf: (user) =>
      jwt.sign({ sub: user.id, email: user.email, role: user.role }),
  };
}

// Đưa database về đúng dữ liệu mẫu trước mỗi test: xóa đơn (kèm món, nguyên liệu đã trừ,
// giao dịch, điểm thưởng của đơn), xóa tài khoản tạo thêm, đặt lại tồn kho và điểm
export async function resetDatabase(prisma: PrismaService) {
  await prisma.$executeRaw`TRUNCATE "Order" RESTART IDENTITY CASCADE`;
  await prisma.user.deleteMany({
    where: { email: { notIn: SAMPLE_USERS.map((user) => user.email) } },
  });
  await prisma.user.updateMany({ data: { loyaltyPoints: 0 } });
  for (const item of INGREDIENTS) {
    await prisma.ingredient.update({
      where: { name: item.name },
      data: { stock: item.stock, version: 0 },
    });
  }
}

// Token của tài khoản mẫu (khach@brewlite.vn, staff@brewlite.vn)
export async function sampleToken(api: TestApi, email: string) {
  const user = await api.prisma.user.findUniqueOrThrow({ where: { email } });
  return api.tokenOf(user);
}

// Tạo thêm `count` khách hàng, trả về token của từng người
export async function createCustomers(api: TestApi, count: number) {
  const tokens: string[] = [];
  for (let i = 1; i <= count; i++) {
    const user = await api.prisma.user.create({
      data: {
        name: `Khách thử ${i}`,
        email: `khach-thu-${i}@brewlite.vn`,
        passwordHash: 'khong-dang-nhap-bang-mat-khau',
        role: Role.CUSTOMER,
      },
    });
    tokens.push(api.tokenOf(user));
  }
  return tokens;
}

// Mã món, mã topping theo tên trong dữ liệu mẫu
export async function productId(api: TestApi, name: string) {
  const product = await api.prisma.product.findUniqueOrThrow({
    where: { name },
  });
  return product.id;
}

export async function toppingId(api: TestApi, name: string) {
  const topping = await api.prisma.topping.findUniqueOrThrow({
    where: { name },
  });
  return topping.id;
}

// Tồn kho hiện tại: tên nguyên liệu → số lượng
export async function stocks(prisma: PrismaService) {
  const rows = await prisma.ingredient.findMany({
    select: { name: true, stock: true },
  });
  return Object.fromEntries(rows.map((row) => [row.name, row.stock]));
}
