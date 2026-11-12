import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unitPrice } from '../common/pricing.js';
import { groupBy, ingredientsForLine, maxCups } from '../common/recipe.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { generateOrderCode } from './order-code.js';
import { assertTransition, WAITING_STATUSES } from './order-status.js';
import { ORDER_SELECT, toOrderView } from './order-view.js';
import { PAYMENT_HOOKS, type PaymentHooks } from './payment-hooks.js';

// Ai hủy đơn: khách (FR-17), nhân viên (FR-22) hay hệ thống tự hủy (FR-13)
export type CancelBy = 'CUSTOMER' | 'STAFF' | 'SYSTEM';

// Nguyên liệu vừa bị yêu cầu khác sửa (version đã đổi): làm lại transaction
class StockConflictError extends Error {}

// ADR 004: thử lại tối đa 10 lần, mỗi lần chờ một khoảng ngẫu nhiên ngắn
const MAX_ATTEMPTS = 10;
const waitBeforeRetry = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt));

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_HOOKS) private readonly payments: PaymentHooks,
  ) {}

  // Hạn thanh toán (BR-05): mặc định 5 phút, đổi bằng biến ORDER_PAYMENT_MINUTES
  private paymentMinutes(): number {
    return Number(this.config.get('ORDER_PAYMENT_MINUTES')) || 5;
  }

  // POST /orders (FR-10, FR-11, FR-12)
  async create(userId: number, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds))];

    // Giá và công thức luôn lấy từ database, web không gửi giá (BR-02)
    const [products, toppings, recipes, toppingRecipes] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.topping.findMany({
        where: { id: { in: toppingIds } },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.recipe.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, ingredientId: true, amount: true },
      }),
      this.prisma.toppingRecipe.findMany({
        where: { toppingId: { in: toppingIds } },
        select: { toppingId: true, ingredientId: true, amount: true },
      }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const toppingById = new Map(toppings.map((t) => [t.id, t]));
    const recipesByProduct = groupBy(recipes, (r) => r.productId);
    const recipesByTopping = groupBy(toppingRecipes, (r) => r.toppingId);

    // Tính tiền từng dòng theo BR-01
    const lines = dto.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Món #${item.productId} không tồn tại`);
      }
      // Bỏ topping gửi trùng để không tính tiền hai lần
      const chosen = [...new Set(item.toppingIds)].map((id) => {
        const topping = toppingById.get(id);
        if (!topping) {
          throw new BadRequestException(`Topping #${id} không tồn tại`);
        }
        return topping;
      });
      const price = unitPrice(
        product.price,
        item.size,
        chosen.map((t) => t.price),
      );
      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        toppings: chosen.map((t) => t.name),
        toppingIds: chosen.map((t) => t.id),
        quantity: item.quantity,
        unitPrice: price,
        lineTotal: price * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    // Mã giảm giá: server kiểm tra lại và tự tính số tiền giảm (BR-07)
    const promotion = dto.promotionCode
      ? await this.promotions.calculate(dto.promotionCode, subtotal)
      : null;
    const discount = promotion?.discount ?? 0;
    const total = subtotal - discount;

    // Nguyên liệu cần cho `quantity` ly của dòng thứ i (BR-03)
    const needsOf = (i: number, quantity: number) =>
      ingredientsForLine(
        recipesByProduct.get(lines[i].productId) ?? [],
        lines[i].toppingIds.map((id) => recipesByTopping.get(id) ?? []),
        lines[i].size,
        quantity,
      );

    // Cộng dồn nguyên liệu của cả đơn: ingredientId → tổng lượng cần
    const needed = new Map<number, number>();
    lines.forEach((line, i) => {
      const perLine = needsOf(i, line.quantity);
      if (perLine.size === 0) {
        throw new BadRequestException(
          `Món ${line.productName} chưa có công thức pha chế`,
        );
      }
      for (const [ingredientId, amount] of perLine) {
        needed.set(ingredientId, (needed.get(ingredientId) ?? 0) + amount);
      }
    });

    // Thiếu nguyên liệu nào thì báo đúng tên món và số ly còn pha được (FR-11 tiêu chí 2)
    const assertEnough = (available: Map<number, number>) => {
      for (const [ingredientId, amount] of needed) {
        if ((available.get(ingredientId) ?? 0) >= amount) continue;
        const i = lines.findIndex((_, j) => needsOf(j, 1).has(ingredientId));
        throw new BadRequestException(
          `Món ${lines[i].productName} không đủ nguyên liệu, chỉ còn pha được ${maxCups(available, needsOf(i, 1))} ly`,
        );
      }
    };

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Đơn chờ cũ của khách (BR-06): hủy trong cùng transaction, trả lại nguyên liệu đã giữ
          const waiting = await tx.order.findMany({
            where: { userId, status: { in: [...WAITING_STATUSES] } },
            select: {
              id: true,
              status: true,
              ingredients: { select: { ingredientId: true, amount: true } },
            },
          });
          const returned = new Map<number, number>();
          for (const row of waiting.flatMap((o) => o.ingredients)) {
            returned.set(
              row.ingredientId,
              (returned.get(row.ingredientId) ?? 0) + row.amount,
            );
          }

          // Đọc tồn kho và version, theo thứ tự ingredientId tăng dần (ADR 004)
          const ids = [...new Set([...needed.keys(), ...returned.keys()])].sort(
            (a, b) => a - b,
          );
          const rows = await tx.ingredient.findMany({
            where: { id: { in: ids } },
            select: { id: true, stock: true, version: true },
          });
          const version = new Map(rows.map((r) => [r.id, r.version]));
          // Tồn kho có tính phần đơn chờ cũ sắp trả lại
          const available = new Map(
            rows.map((r) => [r.id, r.stock + (returned.get(r.id) ?? 0)]),
          );

          // Không đủ: ném lỗi 400, transaction hủy, đơn chờ cũ và kho giữ nguyên (FR-12 tiêu chí 2)
          assertEnough(available);

          for (const old of waiting) {
            const result = await tx.order.updateMany({
              where: { id: old.id, status: old.status },
              data: { status: OrderStatus.CANCELLED },
            });
            // Đơn cũ vừa đổi trạng thái (ví dụ vừa thanh toán xong): đọc lại từ đầu
            if (result.count === 0) throw new StockConflictError();
          }

          // Trả phần đơn cũ và trừ phần đơn mới trong một câu lệnh mỗi nguyên liệu,
          // chỉ ghi được khi version chưa đổi (optimistic locking, BR-04)
          for (const id of ids) {
            const change = (returned.get(id) ?? 0) - (needed.get(id) ?? 0);
            if (change === 0) continue;
            const result = await tx.ingredient.updateMany({
              where: { id, version: version.get(id) },
              data: { stock: { increment: change }, version: { increment: 1 } },
            });
            if (result.count === 0) throw new StockConflictError();
          }

          // Tạo đơn PENDING, ghi lại lượng nguyên liệu đã trừ để hủy thì trả đúng (FR-11 tiêu chí 4)
          const order = await tx.order.create({
            data: {
              code: generateOrderCode(),
              status: OrderStatus.PENDING,
              subtotal,
              discount,
              total,
              paymentMethod: dto.paymentMethod,
              expiresAt: new Date(Date.now() + this.paymentMinutes() * 60_000),
              userId,
              promotionId: promotion?.promotionId ?? null,
              items: {
                create: lines.map(({ toppingIds: _ids, ...line }) => line),
              },
              ingredients: {
                create: [...needed].map(([ingredientId, amount]) => ({
                  ingredientId,
                  amount,
                })),
              },
            },
            select: { id: true, code: true, total: true, expiresAt: true },
          });
          // Sequence-01: 201 { orderId, code, total, expiresAt }
          return {
            orderId: order.id,
            code: order.code,
            total: order.total,
            expiresAt: order.expiresAt,
          };
        });
      } catch (error) {
        if (!(error instanceof StockConflictError)) throw error;
        if (attempt >= MAX_ATTEMPTS) {
          throw new ConflictException(
            'Hệ thống đang bận, vui lòng đặt lại sau giây lát',
          );
        }
        await waitBeforeRetry(attempt);
      }
    }
  }

  // GET /orders/me: đơn của chính khách, mới nhất trước (FR-20 tiêu chí 1)
  async findMine(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: ORDER_SELECT,
    });
    return orders.map(toOrderView);
  }

  // GET /orders/:id: đơn không tồn tại hay của người khác đều trả 404 (FR-20 tiêu chí 2)
  async findOne(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: ORDER_SELECT,
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return toOrderView(order);
  }

  // Hủy đơn: khách (FR-17), nhân viên (FR-22) và tác vụ tự hủy (FR-13) đều gọi hàm này
  async cancel(id: number, by: CancelBy, userId?: number) {
    const order = await this.prisma.order.findFirst({
      // Khách chỉ hủy được đơn của mình; đơn người khác coi như không tồn tại
      where: by === 'CUSTOMER' ? { id, userId } : { id },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    // BR-10: nhân viên chỉ hủy được đơn PAID
    if (by === 'STAFF' && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Nhân viên chỉ hủy được đơn đã thanh toán');
    }
    // BR-09: chỉ hủy từ PENDING, PAYMENT_FAILED, PAID
    assertTransition(order.status, OrderStatus.CANCELLED);
    const wasPaid = order.status === OrderStatus.PAID;

    await this.prisma.$transaction(async (tx) => {
      // Chỉ đổi khi trạng thái vẫn như lúc đọc: hai yêu cầu cùng lúc thì một bên thắng (BR-11)
      const result = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: OrderStatus.CANCELLED },
      });
      if (result.count === 0) {
        throw new ConflictException(
          by === 'STAFF'
            ? 'Đơn vừa đổi trạng thái, vui lòng tải lại'
            : 'Đơn đã thay đổi trạng thái, vui lòng tải lại',
        );
      }

      // Trả lại đúng lượng nguyên liệu đã trừ khi tạo đơn (BR-04).
      // Tăng version để đơn đang tạo dở đọc lại tồn kho mới.
      const used = await tx.orderIngredient.findMany({
        where: { orderId: id },
        orderBy: { ingredientId: 'asc' },
        select: { ingredientId: true, amount: true },
      });
      for (const row of used) {
        await tx.ingredient.update({
          where: { id: row.ingredientId },
          data: { stock: { increment: row.amount }, version: { increment: 1 } },
        });
      }

      // Đơn đã PAID: trừ lại điểm trong cùng transaction (BR-08)
      if (wasPaid) {
        await this.payments.revokePoints(tx, id);
      }
    });

    // Hoàn tiền gọi VNPay nên làm sau khi transaction xong (ADR 005, BR-13)
    if (wasPaid) {
      try {
        await this.payments.refund(id);
      } catch (error) {
        this.logger.warn(
          `Chưa gửi được hoàn tiền cho đơn #${id}: ${String(error)}`,
        );
      }
    }

    const cancelled = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      select: ORDER_SELECT,
    });
    return toOrderView(cancelled);
  }
}
