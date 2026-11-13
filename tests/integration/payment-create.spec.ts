import {
  OrderStatus,
  PaymentStatus,
} from '../../apps/api/src/generated/prisma/enums.js';
import {
  createTestApi,
  productId,
  resetDatabase,
  resetGateway,
  sampleToken,
  type TestApi,
} from './helpers.js';

describe('Tạo giao dịch thanh toán và Idempotency-Key (INT-T07 – INT-T08)', () => {
  let api: TestApi;
  let khach: string;
  let nhanVien: string;
  let caPheSua: number;

  beforeAll(async () => {
    api = await createTestApi();
    khach = await sampleToken(api, 'khach@brewlite.vn');
    nhanVien = await sampleToken(api, 'staff@brewlite.vn');
    caPheSua = await productId(api, 'Cà phê sữa đá');
  });

  afterAll(async () => {
    await api.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(api.prisma);
    resetGateway(api.gateway);
  });

  // Khách đặt 2 ly Cà phê sữa đá M: (29.000 + 5.000) × 2 = 68.000đ
  const placeOrder = async () => {
    const res = await api
      .http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({
        items: [
          { productId: caPheSua, size: 'M', toppingIds: [], quantity: 2 },
        ],
        paymentMethod: 'CARD',
      });
    expect(res.status).toBe(201);
    return res.body as { orderId: number; total: number; expiresAt: string };
  };
  const pay = (
    token: string,
    body: { orderId: number; method: string },
    key?: string,
  ) => {
    const req = api
      .http()
      .post('/payments')
      .set('Authorization', `Bearer ${token}`);
    if (key !== undefined) req.set('Idempotency-Key', key);
    return req.send(body);
  };

  it('INT-T07: POST /payments lưu giao dịch PENDING đúng số tiền của đơn; gửi lại cùng khóa trả giao dịch cũ; lỗi khóa, quyền, đơn trả đúng mã (FR-14, FR-15, BR-02)', async () => {
    const order = await placeOrder();
    expect(order.total).toBe(68000);

    // Thiếu khóa: 400; chưa đăng nhập: 401; đơn của người khác: 404
    const noKey = await pay(khach, { orderId: order.orderId, method: 'CARD' });
    expect(noKey.status).toBe(400);
    expect(noKey.body.message).toBe('Thiếu header Idempotency-Key');
    const noToken = await api
      .http()
      .post('/payments')
      .set('Idempotency-Key', 'khoa-1')
      .send({ orderId: order.orderId, method: 'CARD' });
    expect(noToken.status).toBe(401);
    const otherCustomer = await pay(
      nhanVien,
      { orderId: order.orderId, method: 'CARD' },
      'khoa-nv',
    );
    expect(otherCustomer.status).toBe(404);

    // Tạo giao dịch: 201 { txnRef, payUrl }; Thẻ gửi VNBANK; số tiền lấy từ đơn đã lưu
    const first = await pay(
      khach,
      { orderId: order.orderId, method: 'CARD' },
      'khoa-1',
    );
    expect(first.status).toBe(201);
    expect(first.body.payUrl).toContain('vnp_BankCode=VNBANK');
    expect(first.body.payUrl).toContain(`vnp_Amount=${68000 * 100}`);
    const saved = await api.prisma.payment.findUniqueOrThrow({
      where: { txnRef: first.body.txnRef },
    });
    expect(saved).toMatchObject({
      orderId: order.orderId,
      method: 'CARD',
      amount: 68000,
      status: PaymentStatus.PENDING,
      idempotencyKey: 'khoa-1',
    });
    expect(api.gateway.payUrls[0].expireDate.toISOString()).toBe(
      order.expiresAt,
    );

    // Gửi lại cùng khóa: trả lại đúng giao dịch cũ, không tạo thêm
    const again = await pay(
      khach,
      { orderId: order.orderId, method: 'CARD' },
      'khoa-1',
    );
    expect(again.status).toBe(201);
    expect(again.body).toEqual(first.body);
    // Cùng khóa nhưng đổi phương thức: 409
    const otherMethod = await pay(
      khach,
      { orderId: order.orderId, method: 'WALLET' },
      'khoa-1',
    );
    expect(otherMethod.status).toBe(409);
    expect(otherMethod.body.message).toBe(
      'Idempotency-Key đã được dùng cho một thanh toán khác',
    );
    expect(await api.prisma.payment.count()).toBe(1);
    expect(
      (await api.prisma.order.findUniqueOrThrow({ where: { id: order.orderId } }))
        .status,
    ).toBe(OrderStatus.PENDING);
  });

  it('INT-T08: 5 yêu cầu cùng Idempotency-Key gửi đồng thời chỉ tạo đúng 1 giao dịch; đơn quá hạn không tạo được giao dịch (FR-15, FR-16, BR-05)', async () => {
    const order = await placeOrder();

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map(() =>
        pay(khach, { orderId: order.orderId, method: 'WALLET' }, 'khoa-dong-thoi'),
      ),
    );

    expect(results.map((res) => res.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(results.map((res) => res.body.txnRef)).size).toBe(1);
    expect(await api.prisma.payment.count()).toBe(1);
    // Ví không gửi mã ngân hàng, khách chọn cách trả trên trang VNPay
    expect(results[0].body.payUrl).not.toContain('vnp_BankCode');

    // Đơn quá hạn: 400, không tạo giao dịch, không gia hạn
    const late = await placeOrder();
    const past = new Date(Date.now() - 1000);
    await api.prisma.order.update({
      where: { id: late.orderId },
      data: { expiresAt: past },
    });
    const expired = await pay(
      khach,
      { orderId: late.orderId, method: 'WALLET' },
      'khoa-qua-han',
    );
    expect(expired.status).toBe(400);
    expect(expired.body.message).toBe('Đơn đã hết thời gian thanh toán');
    expect(
      await api.prisma.payment.count({ where: { orderId: late.orderId } }),
    ).toBe(0);
  });
});
