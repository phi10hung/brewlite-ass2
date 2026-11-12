import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PromotionsService } from './promotions.service.js';

const TOMORROW = new Date(Date.now() + 86_400_000);
const YESTERDAY = new Date(Date.now() - 86_400_000);
const PROMOTIONS = [
  {
    id: 1,
    code: 'GIAM10',
    type: 'PERCENT',
    value: 10,
    minOrder: 0,
    active: true,
    expiresAt: TOMORROW,
  },
  {
    id: 2,
    code: 'GIAM20K',
    type: 'FIXED',
    value: 20000,
    minOrder: 50000,
    active: true,
    expiresAt: TOMORROW,
  },
  {
    id: 3,
    code: 'HETHAN',
    type: 'PERCENT',
    value: 15,
    minOrder: 0,
    active: true,
    expiresAt: YESTERDAY,
  },
  {
    id: 4,
    code: 'NGUNG',
    type: 'FIXED',
    value: 10000,
    minOrder: 0,
    active: false,
    expiresAt: TOMORROW,
  },
];

const prisma = {
  promotion: {
    findUnique: vi.fn(({ where }: { where: { code: string } }) =>
      Promise.resolve(PROMOTIONS.find((p) => p.code === where.code) ?? null),
    ),
  },
};
const service = new PromotionsService(prisma as unknown as PrismaService);

describe('Mã giảm giá BR-07 (UT-58 – UT-59)', () => {
  it('UT-58: giảm theo phần trăm hoặc số tiền cố định, không phân biệt chữ hoa, không giảm quá tạm tính', async () => {
    await expect(service.calculate(' giam10 ', 125000)).resolves.toEqual({
      promotionId: 1,
      code: 'GIAM10',
      discount: 12500,
    });
    await expect(service.calculate('GIAM20K', 60000)).resolves.toMatchObject({
      discount: 20000,
    });
  });

  it('UT-59: mã không tồn tại, ngừng, hết hạn, chưa đạt tối thiểu đều trả 400 kèm lý do', async () => {
    const reason = (code: string, subtotal = 100000) =>
      service
        .calculate(code, subtotal)
        .catch((e: BadRequestException) => e.message);

    expect(await reason('KHONGCO')).toBe('Mã giảm giá không tồn tại');
    expect(await reason('NGUNG')).toBe('Mã giảm giá đã ngừng áp dụng');
    expect(await reason('HETHAN')).toBe('Mã giảm giá đã hết hạn');
    expect(await reason('GIAM20K', 30000)).toBe(
      'Đơn hàng chưa đạt tối thiểu 50.000đ để dùng mã này',
    );
    expect(await reason('  ')).toBe('Vui lòng nhập mã giảm giá');
  });
});
