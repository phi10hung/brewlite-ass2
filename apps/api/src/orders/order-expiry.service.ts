import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { WAITING_STATUSES } from './order-status.js';
import { OrdersService } from './orders.service.js';
import { PAYMENT_HOOKS, type PaymentHooks } from './payment-hooks.js';

// Quá hạn thêm chừng này mà vẫn chưa xác minh được với VNPay thì coi như chưa trả (BR-05)
export const UNKNOWN_GRACE_MS = 10 * 60_000;

// Tự hủy đơn quá hạn thanh toán (FR-13, BR-05)
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);
  // Lần chạy trước chưa xong thì bỏ qua lần này, tránh xử lý một đơn hai lần
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    @Inject(PAYMENT_HOOKS) private readonly payments: PaymentHooks,
  ) {}

  // Cứ 30 giây kiểm tra một lần (FR-13 tiêu chí 1). Trả về số đơn đã hủy.
  @Interval(30_000)
  async cancelExpiredOrders(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let cancelled = 0;
    try {
      const expired = await this.prisma.order.findMany({
        where: {
          status: { in: [...WAITING_STATUSES] },
          expiresAt: { lt: new Date() },
        },
        orderBy: { id: 'asc' },
        select: { id: true, code: true, expiresAt: true },
      });
      for (const order of expired) {
        if (await this.cancelOne(order)) cancelled++;
      }
    } catch (error) {
      this.logger.warn(`Không kiểm tra được đơn quá hạn: ${String(error)}`);
    } finally {
      this.running = false;
    }
    return cancelled;
  }

  private async cancelOne(order: {
    id: number;
    code: string;
    expiresAt: Date;
  }): Promise<boolean> {
    // Hỏi lại VNPay trước: khách có thể đã trả xong nhưng chưa quay lại web (FR-13 tiêu chí 2)
    const check = await this.payments
      .checkBeforeExpire(order.id)
      .catch(() => 'UNKNOWN' as const);
    // Đã có tiền thì không hủy
    if (check === 'PAID') return false;
    if (check === 'UNKNOWN') {
      // Chưa xác minh được: để lần sau (UC-04 E5)
      if (Date.now() - order.expiresAt.getTime() < UNKNOWN_GRACE_MS) {
        return false;
      }
      // VNPay lỗi mãi (Sandbox trả mã 99): quá hạn thêm 10 phút thì hủy để trả kho.
      // Giao dịch vẫn chờ: sau này có kết quả thành công có chữ ký thì hoàn tiền (BR-13).
      this.logger.warn(
        `Chưa xác minh được thanh toán đơn ${order.code} sau 10 phút quá hạn: hủy đơn`,
      );
    }

    try {
      await this.orders.cancel(order.id, 'SYSTEM');
      this.logger.log(`Tự hủy đơn quá hạn thanh toán ${order.code}`);
      return true;
    } catch (error) {
      // Đơn vừa đổi trạng thái (khách vừa trả xong hoặc vừa tự hủy) thì bỏ qua
      this.logger.warn(`Bỏ qua đơn ${order.code}: ${String(error)}`);
      return false;
    }
  }
}
