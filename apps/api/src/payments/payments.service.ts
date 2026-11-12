import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import {
  LoyaltyType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '../generated/prisma/enums.js';
import { STATUS_LABEL, WAITING_STATUSES } from '../orders/order-status.js';
import type { ExpireCheck, PaymentHooks } from '../orders/payment-hooks.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  type QueryResult,
} from './payment-gateway.js';
import { vnpayMessage } from './vnpay-messages.js';

// Kết quả cuối cùng của một giao dịch sau khi xác minh
type Verdict = 'SUCCESS' | 'FAILED' | 'UNKNOWN';

// Kết quả trả cho web sau khi xác minh Return URL (FR-19)
export type PaymentResult = {
  orderId: number;
  code: string;
  status: OrderStatus;
  message: string;
};

// Phản hồi IPN theo quy định của VNPay
export type IpnResponse = { RspCode: string; Message: string };
const IPN = {
  OK: { RspCode: '00', Message: 'Confirm Success' },
  NOT_FOUND: { RspCode: '01', Message: 'Order not found' },
  DONE: { RspCode: '02', Message: 'Order already confirmed' },
  WRONG_AMOUNT: { RspCode: '04', Message: 'Invalid amount' },
  WRONG_SIGNATURE: { RspCode: '97', Message: 'Invalid signature' },
  RETRY: { RspCode: '99', Message: 'Unknown error' },
} as const;

const TXN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Mã giao dịch = mã đơn bỏ dấu "-" + 6 ký tự ngẫu nhiên (mỗi lần thanh toán một mã)
function newTxnRef(orderCode: string): string {
  const suffix = [...randomBytes(6)]
    .map((b) => TXN_CHARS[b % TXN_CHARS.length])
    .join('');
  return `${orderCode.replace(/[^A-Za-z0-9]/g, '')}${suffix}`;
}

// Prisma báo trùng giá trị unique bằng mã P2002
const isUniqueError = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002';

// Query string có thể lặp tham số: chỉ lấy chuỗi đầu tiên
function toParams(query: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    const first = Array.isArray(value) ? (value[0] as unknown) : value;
    if (typeof first === 'string') params[key] = first;
  }
  return params;
}

@Injectable()
export class PaymentsService implements PaymentHooks {
  private readonly logger = new Logger(PaymentsService.name);
  // Đơn đang được hoàn tiền trong tiến trình này, tránh gọi VNPay hai lần cùng lúc
  private readonly refunding = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  // POST /payments (FR-14, FR-15, FR-16)
  async create(
    userId: number,
    idempotencyKey: string | undefined,
    dto: CreatePaymentDto,
    ipAddr: string,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    // Đơn không có hoặc của khách khác đều trả 404
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        expiresAt: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Gửi lại cùng khóa: trả lại giao dịch đã tạo (FR-15 tiêu chí 2, 3)
    const existing = await this.findByKey(key);
    if (existing) return this.sameRequest(existing, order.id, dto.method);

    if (!WAITING_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Đơn đang ở trạng thái "${STATUS_LABEL[order.status]}", không thanh toán được`,
      );
    }
    // Thanh toán lại không kéo dài hạn (BR-05)
    if (order.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Đơn đã hết thời gian thanh toán');
    }
    // Giao dịch trước chưa rõ kết quả thì không tạo thêm (FR-16 tiêu chí 4)
    const previous = await this.settlePending(order.id);
    if (previous === 'PAID') {
      throw new BadRequestException('Đơn đã được thanh toán');
    }
    if (previous === 'UNKNOWN') {
      throw new ConflictException(
        'Đang kiểm tra giao dịch trước, vui lòng thử lại sau giây lát',
      );
    }

    const createDate = new Date();
    for (let attempt = 1; attempt <= 3; attempt++) {
      const txnRef = newTxnRef(order.code);
      const payUrl = this.gateway.createPayUrl({
        txnRef,
        amount: order.total,
        orderInfo: `Thanh toan don ${order.code}`,
        ipAddr,
        createDate,
        expireDate: order.expiresAt,
        bankCode: dto.method === PaymentMethod.CARD ? 'VNBANK' : undefined,
      });
      try {
        await this.prisma.$transaction(async (tx) => {
          // Số tiền lấy từ đơn đã lưu, không lấy từ web (BR-02)
          await tx.payment.create({
            data: {
              orderId: order.id,
              method: dto.method,
              amount: order.total,
              idempotencyKey: key,
              txnRef,
              payUrl,
              createdAt: createDate,
            },
          });
          // PAYMENT_FAILED → PENDING khi tạo được giao dịch mới (BR-09, FR-16 tiêu chí 2)
          const result = await tx.order.updateMany({
            where: { id: order.id, status: { in: [...WAITING_STATUSES] } },
            data: { status: OrderStatus.PENDING, paymentMethod: dto.method },
          });
          if (result.count === 0) {
            throw new ConflictException(
              'Đơn đã thay đổi trạng thái, vui lòng tải lại',
            );
          }
        });
        // Sequence-01: 201 { txnRef, payUrl }
        return { txnRef, payUrl };
      } catch (error) {
        if (!isUniqueError(error)) throw error;
        // Hai yêu cầu cùng khóa đến cùng lúc: database chỉ nhận một (FR-15 tiêu chí 2)
        const raced = await this.findByKey(key);
        if (raced) return this.sameRequest(raced, order.id, dto.method);
        // Trùng mã giao dịch (rất hiếm): tạo mã khác rồi thử lại
      }
    }
    throw new ConflictException('Không tạo được giao dịch, vui lòng thử lại');
  }

  // GET /payments/vnpay-return: web gửi lại toàn bộ tham số VNPay trả về (FR-14 tiêu chí 4, FR-19)
  async handleReturn(query: Record<string, unknown>): Promise<PaymentResult> {
    const params = toParams(query);
    if (!this.gateway.verifySignature(params)) {
      throw new BadRequestException('Chữ ký VNPay không hợp lệ');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { txnRef: params.vnp_TxnRef ?? '' },
      select: { id: true, amount: true, createdAt: true, txnRef: true },
    });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }
    if (Number(params.vnp_Amount) !== payment.amount * 100) {
      throw new BadRequestException('Số tiền VNPay không khớp với đơn hàng');
    }

    const verdict = await this.verify(payment, params.vnp_ResponseCode);
    const order = await this.apply(payment.id, verdict.result, verdict.query);

    let message = 'Đang kiểm tra thanh toán';
    if (order.status === OrderStatus.PAID) message = 'Thanh toán thành công';
    else if (verdict.result === 'FAILED') {
      message = vnpayMessage(params.vnp_ResponseCode ?? '');
    }
    return {
      orderId: order.id,
      code: order.code,
      status: order.status,
      message,
    };
  }

  // GET /payments/vnpay-ipn: VNPay gọi thẳng tới API, có thể đến nhiều lần
  async handleIpn(query: Record<string, unknown>): Promise<IpnResponse> {
    const params = toParams(query);
    if (!this.gateway.verifySignature(params)) return IPN.WRONG_SIGNATURE;
    const payment = await this.prisma.payment.findUnique({
      where: { txnRef: params.vnp_TxnRef ?? '' },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        txnRef: true,
        status: true,
      },
    });
    if (!payment) return IPN.NOT_FOUND;
    if (Number(params.vnp_Amount) !== payment.amount * 100) {
      return IPN.WRONG_AMOUNT;
    }
    if (payment.status !== PaymentStatus.PENDING) return IPN.DONE;

    try {
      const verdict = await this.verify(payment, params.vnp_ResponseCode);
      // Chưa xác minh được: báo VNPay gửi lại sau
      if (verdict.result === 'UNKNOWN') return IPN.RETRY;
      await this.apply(payment.id, verdict.result, verdict.query);
      return IPN.OK;
    } catch (error) {
      this.logger.warn(`Xử lý IPN lỗi: ${String(error)}`);
      return IPN.RETRY;
    }
  }

  // ===== Việc OrdersModule gọi qua PaymentHooks (#58) =====

  // Trước khi tự hủy đơn quá hạn: hỏi lại VNPay các giao dịch đang chờ (BR-05, FR-13)
  async checkBeforeExpire(orderId: number): Promise<ExpireCheck> {
    return this.settlePending(orderId);
  }

  // Hủy đơn PAID: trừ lại đúng số điểm đã cộng, số dư không âm (BR-08, FR-18 tiêu chí 2)
  async revokePoints(
    tx: Prisma.TransactionClient,
    orderId: number,
  ): Promise<void> {
    const earn = await tx.loyaltyTransaction.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyType.EARN } },
      select: { userId: true, points: true },
    });
    const revoked = await tx.loyaltyTransaction.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyType.REVOKE } },
      select: { id: true },
    });
    // Chưa cộng điểm, hoặc đã trừ rồi: không làm gì
    if (!earn || revoked) return;

    const user = await tx.user.findUniqueOrThrow({
      where: { id: earn.userId },
      select: { loyaltyPoints: true },
    });
    const points = Math.min(earn.points, user.loyaltyPoints);
    await tx.user.update({
      where: { id: earn.userId },
      data: { loyaltyPoints: { decrement: points } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId: earn.userId,
        orderId,
        type: LoyaltyType.REVOKE,
        points,
      },
    });
  }

  // Hoàn tiền cho đơn đã trả tiền (BR-13). Lỗi thì ghi lại để tác vụ 60 giây thử lại.
  async refund(orderId: number): Promise<void> {
    if (this.refunding.has(orderId)) return;
    this.refunding.add(orderId);
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { orderId, status: PaymentStatus.SUCCESS },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          txnRef: true,
          amount: true,
          transactionNo: true,
          createdAt: true,
          refundStatus: true,
        },
      });
      if (!payment || payment.refundStatus === RefundStatus.SUCCESS) return;

      // "Đang hoàn tiền" (FR-17 tiêu chí 3)
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { refundStatus: RefundStatus.PENDING },
      });
      const result = await this.gateway
        .refund({
          txnRef: payment.txnRef,
          amount: payment.amount,
          transactionNo: payment.transactionNo ?? '',
          createDate: payment.createdAt,
        })
        .catch((error: unknown) => ({
          ok: false,
          responseCode: '',
          message: String(error),
        }));

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundStatus: result.ok ? RefundStatus.SUCCESS : RefundStatus.FAILED,
        },
      });
      if (!result.ok) {
        this.logger.warn(
          `Hoàn tiền đơn #${orderId} chưa thành công (${result.responseCode} ${result.message}), sẽ thử lại`,
        );
      }
    } finally {
      this.refunding.delete(orderId);
    }
  }

  // Cứ 60 giây thử lại các lần hoàn tiền chưa thành công (BR-13, FR-17 tiêu chí 3)
  @Interval(60_000)
  async retryRefunds(): Promise<number> {
    try {
      const pending = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCESS,
          refundStatus: { in: [RefundStatus.PENDING, RefundStatus.FAILED] },
        },
        select: { orderId: true },
      });
      for (const { orderId } of pending) await this.refund(orderId);
      return pending.length;
    } catch (error) {
      this.logger.warn(`Không thử lại được hoàn tiền: ${String(error)}`);
      return 0;
    }
  }

  // ===== Phần dùng chung =====

  private findByKey(key: string) {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      select: { orderId: true, method: true, txnRef: true, payUrl: true },
    });
  }

  // Cùng khóa mà khác đơn hoặc khác phương thức: 409 (FR-15 tiêu chí 3)
  private sameRequest(
    payment: {
      orderId: number;
      method: PaymentMethod;
      txnRef: string;
      payUrl: string | null;
    },
    orderId: number,
    method: PaymentMethod,
  ) {
    if (payment.orderId !== orderId || payment.method !== method) {
      throw new ConflictException(
        'Idempotency-Key đã được dùng cho một thanh toán khác',
      );
    }
    return { txnRef: payment.txnRef, payUrl: payment.payUrl };
  }

  // Hỏi lại VNPay mọi giao dịch còn chờ của đơn và ghi kết quả đã rõ.
  // PAID = đơn đã có tiền; UNKNOWN = còn giao dịch chưa xác minh được; UNPAID = chưa có tiền.
  // Giao dịch VNPay báo chưa trả thì để nguyên: khách trả muộn vẫn được ghi nhận (rồi hoàn tiền nếu đơn đã hủy).
  private async settlePending(orderId: number): Promise<ExpireCheck> {
    const pending = await this.prisma.payment.findMany({
      where: { orderId, status: PaymentStatus.PENDING },
      select: { id: true, createdAt: true, txnRef: true },
    });
    let unknown = false;
    for (const payment of pending) {
      const query = await this.query(payment);
      if (query.status === 'UNKNOWN') unknown = true;
      if (query.status === 'SUCCESS' || query.status === 'FAILED') {
        await this.apply(payment.id, query.status, query);
      }
    }
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    if (order.status === OrderStatus.PAID) return 'PAID';
    return unknown ? 'UNKNOWN' : 'UNPAID';
  }

  // Hỏi lại VNPay; mất mạng hoặc VNPay lỗi thì coi là chưa rõ
  private query(payment: {
    txnRef: string;
    createdAt: Date;
  }): Promise<QueryResult> {
    return this.gateway
      .query(payment.txnRef, payment.createdAt)
      .catch((error: unknown) => {
        this.logger.warn(
          `Không hỏi được VNPay ${payment.txnRef}: ${String(error)}`,
        );
        return {
          status: 'UNKNOWN' as const,
          responseCode: '',
          transactionNo: '',
        };
      });
  }

  // BR-12: chỉ thành công khi truy vấn lại VNPay xác nhận.
  // Thất bại: VNPay xác nhận lỗi/chưa trả, hoặc kết quả có chữ ký báo lỗi (khách hủy, sai OTP...).
  private async verify(
    payment: { txnRef: string; createdAt: Date },
    responseCode: string | undefined,
  ): Promise<{ result: Verdict; query: QueryResult }> {
    const query = await this.query(payment);
    if (query.status === 'SUCCESS') return { result: 'SUCCESS', query };
    if (query.status === 'FAILED') return { result: 'FAILED', query };
    const callbackFailed = !!responseCode && responseCode !== '00';
    return { result: callbackFailed ? 'FAILED' : 'UNKNOWN', query };
  }

  // Ghi kết quả đã xác minh, đúng một lần (BR-12, FR-15 tiêu chí 4)
  private async apply(paymentId: number, result: Verdict, query: QueryResult) {
    let refundNeeded = false;
    const order = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { status: true, orderId: true },
      });
      // Chỉ giao dịch còn chờ mới được cập nhật: kết quả gửi lại hay kết quả cũ thì bỏ qua,
      // nên đơn đã PAID không bị quay về PAYMENT_FAILED
      if (result !== 'UNKNOWN' && payment.status === PaymentStatus.PENDING) {
        const success = result === 'SUCCESS';
        const changed = await tx.payment.updateMany({
          where: { id: paymentId, status: PaymentStatus.PENDING },
          data: success
            ? {
                status: PaymentStatus.SUCCESS,
                transactionNo: query.transactionNo || null,
              }
            : { status: PaymentStatus.FAILED },
        });
        if (changed.count === 1 && success) {
          const paid = await tx.order.updateMany({
            where: { id: payment.orderId, status: OrderStatus.PENDING },
            data: { status: OrderStatus.PAID },
          });
          if (paid.count === 1) await this.awardPoints(tx, payment.orderId);
          // Tiền về cho đơn không còn chờ (đã hủy...): đơn giữ nguyên, hoàn tiền (BR-13)
          else refundNeeded = true;
        }
        // Thất bại: đơn sang PAYMENT_FAILED nếu không còn giao dịch nào đang chờ (FR-16 tiêu chí 1)
        if (changed.count === 1 && !success) {
          const others = await tx.payment.count({
            where: { orderId: payment.orderId, status: PaymentStatus.PENDING },
          });
          if (others === 0) {
            await tx.order.updateMany({
              where: { id: payment.orderId, status: OrderStatus.PENDING },
              data: { status: OrderStatus.PAYMENT_FAILED },
            });
          }
        }
      }
      return tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        select: { id: true, code: true, status: true },
      });
    });

    if (refundNeeded) await this.refund(order.id);
    return order;
  }

  // Cộng điểm đúng một lần khi đơn thành PAID: phần nguyên của tổng đơn ÷ 10.000 (BR-08)
  private async awardPoints(tx: Prisma.TransactionClient, orderId: number) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { userId: true, total: true },
    });
    const points = Math.floor(order.total / 10_000);
    // @@unique([orderId, type]) chặn cộng hai lần cho cùng một đơn
    await tx.loyaltyTransaction.create({
      data: { userId: order.userId, orderId, type: LoyaltyType.EARN, points },
    });
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { increment: points } },
    });
  }
}
