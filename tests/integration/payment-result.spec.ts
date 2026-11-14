import {
  LoyaltyType,
  OrderStatus,
  PaymentStatus,
} from '../../apps/api/src/generated/prisma/enums.js';
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

describe('Xác minh kết quả VNPay, điểm thưởng, thanh toán lại (INT-T09 – INT-T11)', () => {
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
  const orderAndPay = async (key = 'khoa-1') => {
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
    const payment = await payAgain(order.body.orderId, key);
    expect(payment.status).toBe(201);
    return {
      orderId: order.body.orderId as number,
      total: order.body.total as number,
      txnRef: payment.body.txnRef as string,
    };
  };
  const payAgain = (orderId: number, key: string) =>
    api
      .http()
      .post('/payments')
      .set('Authorization', `Bearer ${khach}`)
      .set('Idempotency-Key', key)
      .send({ orderId, method: 'WALLET' });
  // Web gửi lại nguyên tham số VNPay trả về (Return URL); VNPay gọi IPN với cùng tham số
  const returnUrl = (params: Record<string, string>) =>
    api.http().get('/payments/vnpay-return').query(params);
  const ipn = (params: Record<string, string>) =>
    api.http().get('/payments/vnpay-ipn').query(params);
  const statusOf = async (id: number) =>
    (await api.prisma.order.findUniqueOrThrow({ where: { id } })).status;
  const pointsOfKhach = async () =>
    (await api.prisma.user.findUniqueOrThrow({ where: { id: khachId } }))
      .loyaltyPoints;

  it('INT-T09: kết quả thành công có chữ ký, đúng số tiền, VNPay xác nhận thì đơn PAID, cộng điểm đúng một lần dù Return URL và IPN gửi nhiều lần; sai chữ ký, sai số tiền bị từ chối (FR-14, FR-15, FR-18, BR-08, BR-12)', async () => {
    const { orderId, total, txnRef } = await orderAndPay();
    expect(total).toBe(102000);
    const callback = api.gateway.callback(txnRef, total);

    // Sai chữ ký, sai số tiền: 400, đơn không đổi
    const fake = await returnUrl({ ...callback, vnp_SecureHash: 'gia-mao' });
    expect(fake.status).toBe(400);
    expect(fake.body.message).toBe('Chữ ký VNPay không hợp lệ');
    const wrongAmount = await returnUrl(api.gateway.callback(txnRef, 1000));
    expect(wrongAmount.status).toBe(400);
    expect(wrongAmount.body.message).toBe(
      'Số tiền VNPay không khớp với đơn hàng',
    );
    expect(await statusOf(orderId)).toBe(OrderStatus.PENDING);

    // VNPay xác nhận khi truy vấn lại: PAID, lưu mã giao dịch, cộng 10 điểm
    api.gateway.results.set(txnRef, 'SUCCESS');
    const ok = await returnUrl(callback);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      orderId,
      status: OrderStatus.PAID,
      message: 'Thanh toán thành công',
    });
    expect(
      await api.prisma.payment.findUniqueOrThrow({ where: { txnRef } }),
    ).toMatchObject({ status: PaymentStatus.SUCCESS, transactionNo: `GD-${txnRef}` });
    expect(await pointsOfKhach()).toBe(10);

    // Return URL gửi lại, IPN đến sau: không cộng điểm thêm; IPN trả mã 02 "đã xác nhận"
    expect((await returnUrl(callback)).body.status).toBe(OrderStatus.PAID);
    const ipnAgain = await ipn(callback);
    expect(ipnAgain.body).toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });
    expect(await pointsOfKhach()).toBe(10);
    expect(
      await api.prisma.loyaltyTransaction.count({
        where: { orderId, type: LoyaltyType.EARN },
      }),
    ).toBe(1);
  });

  it('INT-T10: thanh toán thất bại thì đơn PAYMENT_FAILED kèm lý do tiếng Việt; thanh toán lại tạo giao dịch mới, đơn về PENDING, không trừ kho thêm (FR-16, BR-09)', async () => {
    const first = await orderAndPay('khoa-lan-1');
    const stockAfterOrder = await stocks(api.prisma);
    expect(stockAfterOrder).not.toEqual(SEED_STOCK);

    // Khách hủy ở trang VNPay (mã 24); IPN báo cùng kết quả cũng không làm đổi gì thêm
    const failed = await returnUrl(
      api.gateway.callback(first.txnRef, first.total, '24'),
    );
    expect(failed.body).toMatchObject({
      status: OrderStatus.PAYMENT_FAILED,
      message: 'Bạn đã hủy giao dịch',
    });
    expect(await statusOf(first.orderId)).toBe(OrderStatus.PAYMENT_FAILED);

    // Thanh toán lại cùng đơn với khóa mới
    const retry = await payAgain(first.orderId, 'khoa-lan-2');
    expect(retry.status).toBe(201);
    expect(retry.body.txnRef).not.toBe(first.txnRef);
    expect(await statusOf(first.orderId)).toBe(OrderStatus.PENDING);
    expect(
      await api.prisma.payment.count({ where: { orderId: first.orderId } }),
    ).toBe(2);
    expect(await api.prisma.order.count()).toBe(1);
    expect(await stocks(api.prisma)).toEqual(stockAfterOrder);

    // Lần này trả thành công: PAID; kết quả thất bại cũ gửi lại không kéo đơn về PAYMENT_FAILED
    api.gateway.results.set(retry.body.txnRef, 'SUCCESS');
    const paid = await returnUrl(
      api.gateway.callback(retry.body.txnRef, first.total),
    );
    expect(paid.body.status).toBe(OrderStatus.PAID);
    await returnUrl(api.gateway.callback(first.txnRef, first.total, '24'));
    expect(await statusOf(first.orderId)).toBe(OrderStatus.PAID);
  });

  it('INT-T11: VNPay lỗi khi truy vấn lại (mã 99) thì dùng kết quả có chữ ký, đúng số tiền; VNPay báo chưa thanh toán thì giữ "Đang kiểm tra thanh toán" (BR-12, FR-16 tiêu chí 4, UC-04 E3)', async () => {
    // VNPay báo chưa có giao dịch: chưa tin kết quả gửi về, đơn vẫn chờ
    const checking = await orderAndPay('khoa-cho');
    const pending = await returnUrl(
      api.gateway.callback(checking.txnRef, checking.total),
    );
    expect(pending.body).toMatchObject({
      status: OrderStatus.PENDING,
      message: 'Đang kiểm tra thanh toán',
    });
    // Giao dịch trước chưa rõ kết quả thì không cho tạo giao dịch mới
    api.gateway.results.set(checking.txnRef, 'UNKNOWN');
    const blocked = await payAgain(checking.orderId, 'khoa-moi');
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toBe(
      'Đang kiểm tra giao dịch trước, vui lòng thử lại sau giây lát',
    );

    // VNPay trả mã 99 khi truy vấn: kết quả có chữ ký báo thành công thì ghi nhận PAID
    const paid = await returnUrl(
      api.gateway.callback(checking.txnRef, checking.total),
    );
    expect(paid.body).toMatchObject({
      status: OrderStatus.PAID,
      message: 'Thanh toán thành công',
    });
    expect(
      await api.prisma.payment.findUniqueOrThrow({
        where: { txnRef: checking.txnRef },
      }),
    ).toMatchObject({
      status: PaymentStatus.SUCCESS,
      transactionNo: `VNP-${checking.txnRef}`,
    });
    expect(await pointsOfKhach()).toBe(10);
  });
});
