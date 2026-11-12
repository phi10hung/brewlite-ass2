import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// 0 giờ hôm nay theo giờ Việt Nam (GMT+7), không phụ thuộc múi giờ của server
export function startOfTodayVn(now = new Date()): Date {
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(
    Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) -
      7 * 3_600_000,
  );
}

@Injectable()
export class StaffRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /staff/revenue (FR-23). BR-14: chỉ tính giao dịch thanh toán thành công
  // của đơn không bị hủy, không bị hoàn tiền (không có refundStatus).
  async summary(now = new Date()) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCESS,
        refundStatus: null,
        order: { status: { not: OrderStatus.CANCELLED } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        orderId: true,
        method: true,
        amount: true,
        transactionNo: true,
        createdAt: true,
        order: { select: { code: true, user: { select: { name: true } } } },
      },
    });

    const transactions = payments.map(({ order, ...payment }) => ({
      ...payment,
      orderCode: order.code,
      customerName: order.user.name,
    }));
    const today = startOfTodayVn(now);
    const todays = transactions.filter((t) => t.createdAt >= today);
    const sum = (list: { amount: number }[]) =>
      list.reduce((total, t) => total + t.amount, 0);

    return {
      total: sum(transactions),
      count: transactions.length,
      todayTotal: sum(todays),
      todayCount: todays.length,
      transactions,
    };
  }
}
