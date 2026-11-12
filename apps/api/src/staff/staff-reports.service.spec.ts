import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { StaffIngredientsService } from './staff-ingredients.service.js';
import {
  StaffRevenueService,
  startOfTodayVn,
} from './staff-revenue.service.js';

const CA_PHE = 1;
const SUA = 2;
const KEM = 3;
const MUOI = 4; // không món nào dùng

function ingredientsSetup() {
  const stock = new Map([
    [CA_PHE, { name: 'Cà phê xay', unit: 'g', stock: 179 }],
    [SUA, { name: 'Sữa tươi', unit: 'ml', stock: 2000 }],
    [KEM, { name: 'Kem cheese', unit: 'ml', stock: 299 }],
    [MUOI, { name: 'Muối', unit: 'g', stock: 0 }],
  ]);
  const prisma = {
    // Công thức size M: cà phê tối đa 18 g/ly, sữa tối đa 200 ml/ly; kem cheese là topping 30 ml
    recipe: {
      findMany: vi.fn().mockResolvedValue([
        { ingredientId: CA_PHE, amount: 18 },
        { ingredientId: CA_PHE, amount: 10 },
        { ingredientId: SUA, amount: 200 },
      ]),
    },
    toppingRecipe: {
      findMany: vi.fn().mockResolvedValue([{ ingredientId: KEM, amount: 30 }]),
    },
    ingredient: {
      findMany: vi.fn(() =>
        Promise.resolve([...stock].map(([id, i]) => ({ id, ...i }))),
      ),
      findUnique: vi.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve(stock.has(where.id) ? { id: where.id } : null),
      ),
      update: vi.fn(({ where, data }: { where: { id: number }; data: any }) => {
        const row = stock.get(where.id)!;
        row.stock += data.stock.increment;
        return Promise.resolve({ id: where.id, ...row });
      }),
    },
  };
  const service = new StaffIngredientsService(
    prisma as unknown as PrismaService,
  );
  return { service, prisma };
}

describe('Kho và nhập kho FR-24 (UT-75 – UT-76)', () => {
  it('UT-75: sắp hết khi không đủ pha 10 ly của món hoặc topping dùng nhiều nhất', async () => {
    const { service } = ingredientsSetup();

    const list = await service.list();
    const low = Object.fromEntries(list.map((i) => [i.name, i.lowStock]));

    // Cà phê: 179 < 18 × 10 = 180 → sắp hết; sữa: 2000 = 200 × 10 → chưa
    expect(low['Cà phê xay']).toBe(true);
    expect(low['Sữa tươi']).toBe(false);
    // Topping cũng tính: kem cheese 299 < 30 × 10
    expect(low['Kem cheese']).toBe(true);
    // Nguyên liệu không món nào dùng thì không cảnh báo
    expect(low['Muối']).toBe(false);
  });

  it('UT-76: nhập kho cộng thêm số lượng, tăng version, tính lại sắp hết; nguyên liệu không có thì 404', async () => {
    const { service, prisma } = ingredientsSetup();

    const result = await service.restock(CA_PHE, 21);

    expect(result).toEqual({
      id: CA_PHE,
      name: 'Cà phê xay',
      unit: 'g',
      stock: 200,
      lowStock: false,
    });
    expect(prisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { increment: 21 }, version: { increment: 1 } },
      }),
    );
    await expect(service.restock(99, 5)).rejects.toThrow(
      new NotFoundException('Không tìm thấy nguyên liệu'),
    );
  });
});

describe('Doanh thu FR-23 (UT-77 – UT-78)', () => {
  it('UT-77: chỉ lấy giao dịch thành công của đơn không hủy, không hoàn tiền (BR-14); cộng tổng và riêng hôm nay', async () => {
    const now = new Date('2026-11-12T05:00:00Z'); // 12h trưa 12/11 giờ Việt Nam
    const payment = (id: number, amount: number, createdAt: string) => ({
      id,
      orderId: id,
      method: 'WALLET',
      amount,
      transactionNo: `GD${id}`,
      createdAt: new Date(createdAt),
      order: { code: `BL-DON00${id}`, user: { name: 'Khách' } },
    });
    const prisma = {
      payment: {
        findMany: vi.fn().mockResolvedValue([
          payment(2, 64000, '2026-11-12T02:00:00Z'), // 9h sáng 12/11
          payment(1, 50000, '2026-11-11T16:30:00Z'), // 23h30 ngày 11/11
        ]),
      },
    };
    const service = new StaffRevenueService(prisma as unknown as PrismaService);

    const result = await service.summary(now);

    expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual({
      status: 'SUCCESS',
      refundStatus: null,
      order: { status: { not: 'CANCELLED' } },
    });
    expect(result).toMatchObject({
      total: 114000,
      count: 2,
      todayTotal: 64000,
      todayCount: 1,
    });
    expect(result.transactions[0]).toMatchObject({
      orderCode: 'BL-DON002',
      customerName: 'Khách',
      amount: 64000,
    });
  });

  it('UT-78: "hôm nay" tính theo giờ Việt Nam, không theo giờ server', () => {
    expect(startOfTodayVn(new Date('2026-11-12T16:59:00Z'))).toEqual(
      new Date('2026-11-11T17:00:00Z'),
    );
    expect(startOfTodayVn(new Date('2026-11-12T17:00:00Z'))).toEqual(
      new Date('2026-11-12T17:00:00Z'),
    );
  });
});
