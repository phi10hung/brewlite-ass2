import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums.js';
import { assertTransition } from '../orders/order-status.js';
import { ORDER_SELECT, toOrderView } from '../orders/order-view.js';
import { OrdersService } from '../orders/orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Nhân viên chỉ được đưa đơn sang các trạng thái này (BR-10)
const STAFF_TARGETS: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];

// Đơn kèm tên khách, cho màn hình quầy
const STAFF_ORDER_SELECT = {
  ...ORDER_SELECT,
  user: { select: { name: true } },
} as const;

@Injectable()
export class StaffOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  // GET /staff/orders?status=: đơn đến trước hiện trước, để quầy làm theo thứ tự
  async list(status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: STAFF_ORDER_SELECT,
    });
    return orders.map(({ user, ...order }) => ({
      ...toOrderView(order),
      customerName: user.name,
    }));
  }

  // PATCH /staff/orders/:id/status (FR-21, FR-22)
  async updateStatus(id: number, status: OrderStatus) {
    if (!STAFF_TARGETS.includes(status)) {
      throw new BadRequestException(
        'Nhân viên không được chuyển đơn sang trạng thái này',
      );
    }
    // Hủy: dùng hàm hủy chung (trả nguyên liệu, trừ điểm, hoàn tiền)
    if (status === OrderStatus.CANCELLED) {
      await this.orders.cancel(id, 'STAFF');
      return this.findOne(id);
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    // PAID → PREPARING → READY → COMPLETED; bước khác trả 400 (BR-09)
    assertTransition(order.status, status);

    // Chỉ đổi khi trạng thái vẫn như lúc đọc: hai nhân viên bấm cùng lúc thì một người thắng (BR-11)
    const result = await this.prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status },
    });
    if (result.count === 0) {
      throw new ConflictException('Đơn vừa đổi trạng thái, vui lòng tải lại');
    }
    return this.findOne(id);
  }

  private async findOne(id: number) {
    const { user, ...order } = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      select: STAFF_ORDER_SELECT,
    });
    return { ...toOrderView(order), customerName: user.name };
  }
}
