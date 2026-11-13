import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderExpiryService } from './order-expiry.service.js';
import type { OrdersService } from './orders.service.js';
import type { PaymentHooks } from './payment-hooks.js';

// Đơn vừa quá hạn 1 phút, trừ khi test ghi hạn khác
const JUST_EXPIRED = () => new Date(Date.now() - 60_000);

function setup(expired: { id: number; code: string; expiresAt?: Date }[]) {
  const rows = expired.map((o) => ({ expiresAt: JUST_EXPIRED(), ...o }));
  const prisma = { order: { findMany: vi.fn().mockResolvedValue(rows) } };
  const orders = { cancel: vi.fn().mockResolvedValue({}) };
  const payments = { checkBeforeExpire: vi.fn() };
  const service = new OrderExpiryService(
    prisma as unknown as PrismaService,
    orders as unknown as OrdersService,
    payments as unknown as PaymentHooks,
  );
  return { service, prisma, orders, payments };
}

describe('Tự hủy đơn quá hạn FR-13 (UT-53 – UT-54)', () => {
  it('UT-53: chỉ hủy đơn VNPay xác nhận chưa có tiền; đã có tiền hoặc chưa rõ thì để lần sau', async () => {
    const { service, prisma, orders, payments } = setup([
      { id: 1, code: 'BL-CHUATRA' },
      { id: 2, code: 'BL-DATRA' },
      { id: 3, code: 'BL-CHUARO' },
    ]);
    payments.checkBeforeExpire
      .mockResolvedValueOnce('UNPAID')
      .mockResolvedValueOnce('PAID')
      .mockResolvedValueOnce('UNKNOWN');

    const cancelled = await service.cancelExpiredOrders();

    expect(cancelled).toBe(1);
    expect(orders.cancel).toHaveBeenCalledTimes(1);
    expect(orders.cancel).toHaveBeenCalledWith(1, 'SYSTEM');
    // Chỉ tìm đơn còn chờ thanh toán và đã quá hạn
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.status.in).toEqual(['PENDING', 'PAYMENT_FAILED']);
    expect(where.expiresAt.lt).toBeInstanceOf(Date);
  });

  it('UT-54: hỏi VNPay bị lỗi thì chưa hủy; đơn vừa đổi trạng thái thì bỏ qua, không dừng tác vụ', async () => {
    const { service, orders, payments } = setup([
      { id: 1, code: 'BL-LOIMANG' },
      { id: 2, code: 'BL-VUATRA' },
      { id: 3, code: 'BL-QUAHAN' },
    ]);
    payments.checkBeforeExpire
      .mockRejectedValueOnce(new Error('VNPay không phản hồi'))
      .mockResolvedValue('UNPAID');
    orders.cancel
      .mockRejectedValueOnce(
        new ConflictException('Đơn vừa đổi trạng thái, vui lòng tải lại'),
      )
      .mockResolvedValue({});

    const cancelled = await service.cancelExpiredOrders();

    expect(orders.cancel).not.toHaveBeenCalledWith(1, 'SYSTEM');
    expect(orders.cancel).toHaveBeenCalledWith(3, 'SYSTEM');
    expect(cancelled).toBe(1);
  });
});
