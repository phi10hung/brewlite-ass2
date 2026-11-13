import {
  LoyaltyType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
} from '../../apps/api/src/generated/prisma/enums.js';
import { OrderExpiryService } from '../../apps/api/src/orders/order-expiry.service.js';
import { PaymentsService } from '../../apps/api/src/payments/payments.service.js';
import {
  createTestApi,
  productId,
  resetDatabase,
  resetGateway,
  sampleToken,
  SEED_STOCK,
  stocks,
  type TestApi,
} from './helpers.js';

describe('Hoàn tiền và tự hủy đơn có giao dịch đang chờ (INT-T12 – INT-T13)', () => {
  let api: TestApi;
  let khach: string;
  let khachId: number;
  let caPheSua: number;

  beforeAll(async () => {
    api = await createTestApi();
    khach = await sampleToken(api, 'khach@brewlite.vn');
    khachId = (
      await api.prisma.user.findUniqueOrThrow({
        where: { email: 'khach@brewlite.vn' },
      })
    ).id;
    caPheSua = await productId(api, 'Cà phê sữa đá');
  });

  afterAll(async () => {
    await api.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(api.prisma);
    resetGateway(api.gateway);
  });

  // Đặt 3 ly Cà phê sữa đá M (102.000đ, được 10 điểm) rồi tạo giao dịch Ví
  const orderAndPay = async () => {
    const order = await api
      .http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({
        items: [
          { productId: caPheSua, size: 'M', toppingIds: [], quantity: 3 },
        ],
        paymentMethod: 'WALLET',
      });
    expect(order.status).toBe(201);
    const payment = await api
      .http()
      .post('/payments')
      .set('Authorization', `Bearer ${khach}`)
      .set('Idempotency-Key', `khoa-${order.body.orderId}`)
      .send({ orderId: order.body.orderId, method: 'WALLET' });
    expect(payment.status).toBe(201);
    return {
      orderId: order.body.orderId as number,
      total: order.body.total as number,
      txnRef: payment.body.txnRef as string,
    };
  };
  const returnUrl = (params: Record<string, string>) =>
    api.http().get('/payments/vnpay-return').query(params);
  const paymentOf = (txnRef: string) =>
    api.prisma.payment.findUniqueOrThrow({ where: { txnRef } });
  const pointsOfKhach = async () =>
    (await api.prisma.user.findUniqueOrThrow({ where: { id: khachId } }))
      .loyaltyPoints;

  it('INT-T12: khách hủy đơn đã thanh toán thì trả kho, trừ lại điểm, gửi hoàn tiền; hoàn tiền lỗi thì "Đang hoàn tiền" và tác vụ 60 giây thử lại đến khi thành công (FR-17, BR-08, BR-13)', async () => {
    const { orderId, total, txnRef } = await orderAndPay();
    api.gateway.results.set(txnRef, 'SUCCESS');
    await returnUrl(api.gateway.callback(txnRef, total));
    expect(await pointsOfKhach()).toBe(10);

    // VNPay Sandbox lỗi khi hoàn tiền
    api.gateway.refundOk = false;
    const cancel = await api
      .http()
      .patch(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${khach}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body).toMatchObject({
      status: OrderStatus.CANCELLED,
      refundStatus: RefundStatus.FAILED,
    });
    expect(await stocks(api.prisma)).toEqual(SEED_STOCK);
    expect(await pointsOfKhach()).toBe(0);
    expect(
      await api.prisma.loyaltyTransaction.count({
        where: { orderId, type: LoyaltyType.REVOKE },
      }),
    ).toBe(1);
    expect(api.gateway.refunds).toEqual([txnRef]);

    // Tác vụ thử lại (chạy mỗi 60 giây, ở đây gọi trực tiếp): VNPay hết lỗi thì hoàn tiền xong
    api.gateway.refundOk = true;
    const payments = api.app.get(PaymentsService);
    expect(await payments.retryRefunds()).toBe(1);
    expect((await paymentOf(txnRef)).refundStatus).toBe(RefundStatus.SUCCESS);
    expect(await payments.retryRefunds()).toBe(0);
    const detail = await api
      .http()
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${khach}`);
    expect(detail.body.refundStatus).toBe(RefundStatus.SUCCESS);
  });

  it('INT-T13: đơn quá hạn mà VNPay lỗi mãi khi truy vấn: chưa đủ 10 phút thì chờ, từ 10 phút thì tự hủy, trả kho; tiền về muộn thì đơn giữ hủy, không cộng điểm, được hoàn tiền (FR-13, BR-05, BR-13, UC-04 E5)', async () => {
    const { orderId, total, txnRef } = await orderAndPay();
    api.gateway.results.set(txnRef, 'UNKNOWN');
    const expiry = api.app.get(OrderExpiryService);
    const expireMinutesAgo = (minutes: number) =>
      api.prisma.order.update({
        where: { id: orderId },
        data: { expiresAt: new Date(Date.now() - minutes * 60_000) },
      });

    // Quá hạn 3 phút: chưa xác minh được thì chưa hủy
    await expireMinutesAgo(3);
    expect(await expiry.cancelExpiredOrders()).toBe(0);
    expect(
      (await api.prisma.order.findUniqueOrThrow({ where: { id: orderId } }))
        .status,
    ).toBe(OrderStatus.PENDING);

    // Quá hạn 11 phút: hủy, trả kho; giao dịch vẫn chờ
    await expireMinutesAgo(11);
    expect(await expiry.cancelExpiredOrders()).toBe(1);
    expect(
      (await api.prisma.order.findUniqueOrThrow({ where: { id: orderId } }))
        .status,
    ).toBe(OrderStatus.CANCELLED);
    expect(await stocks(api.prisma)).toEqual(SEED_STOCK);
    expect((await paymentOf(txnRef)).status).toBe(PaymentStatus.PENDING);

    // Khách đã trả trước khi hết hạn, kết quả có chữ ký về muộn: ghi nhận tiền rồi hoàn lại
    const late = await returnUrl(api.gateway.callback(txnRef, total));
    expect(late.status).toBe(200);
    expect(late.body.status).toBe(OrderStatus.CANCELLED);
    expect(await paymentOf(txnRef)).toMatchObject({
      status: PaymentStatus.SUCCESS,
      refundStatus: RefundStatus.SUCCESS,
    });
    expect(api.gateway.refunds).toEqual([txnRef]);
    expect(await pointsOfKhach()).toBe(0);
  });
});
