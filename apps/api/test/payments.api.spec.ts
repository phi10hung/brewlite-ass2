import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PAYMENT_GATEWAY } from '../src/payments/payment-gateway.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createFakePaymentDb } from './fake-payment-db.js';
import { FakePaymentGateway } from './fake-payment-gateway.js';

let fake = createFakePaymentDb();
let gateway = new FakePaymentGateway();
// Mỗi test dùng database giả và cổng thanh toán giả mới
const prisma = new Proxy(
  {},
  { get: (_t, key: string) => fake.db[key] as unknown },
);
const gatewayProxy = new Proxy(
  {},
  {
    get: (_t, key: string) => {
      const value = (gateway as unknown as Record<string, unknown>)[key];
      return typeof value === 'function' ? value.bind(gateway) : value;
    },
  },
);
const PROMOTIONS = [
  {
    id: 1,
    code: 'GIAM10',
    type: 'PERCENT',
    value: 10,
    minOrder: 50000,
    active: true,
    expiresAt: new Date(Date.now() + 86_400_000),
  },
];

describe('API thanh toán, mã giảm giá (API-T26 – API-T30)', () => {
  let app: INestApplication;
  let khach: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(gatewayProxy)
      .compile();
    app = moduleRef.createNestApplication();
    // Cùng cấu hình kiểm tra dữ liệu như src/main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    khach = app
      .get(JwtService)
      .sign({ sub: 7, email: 'khach@brewlite.vn', role: 'CUSTOMER' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fake = createFakePaymentDb();
    fake.db.promotion = {
      findUnique: ({ where }: { where: { code: string } }) =>
        Promise.resolve(PROMOTIONS.find((p) => p.code === where.code) ?? null),
    };
    gateway = new FakePaymentGateway();
  });

  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${khach}` });

  it('API-T26: POST /payments thiếu JWT 401, thiếu Idempotency-Key 400, dữ liệu sai 400', async () => {
    const order = fake.addOrder();

    expect(
      (
        await http()
          .post('/payments')
          .send({ orderId: order.id, method: 'WALLET' })
      ).status,
    ).toBe(401);

    const noKey = await http()
      .post('/payments')
      .set(auth())
      .send({ orderId: order.id, method: 'WALLET' });
    expect(noKey.status).toBe(400);
    expect(noKey.body.message).toBe('Thiếu header Idempotency-Key');

    const bad = await http()
      .post('/payments')
      .set({ ...auth(), 'Idempotency-Key': 'k1' })
      .send({ orderId: 'abc', method: 'MOMO', amount: 1 });
    expect(bad.status).toBe(400);
    expect(fake.tables.payment).toHaveLength(0);
  });

  it('API-T27: POST /payments hợp lệ trả 201 { txnRef, payUrl }; gửi lại cùng khóa trả cùng giao dịch', async () => {
    const order = fake.addOrder();
    const send = () =>
      http()
        .post('/payments')
        .set({ ...auth(), 'Idempotency-Key': 'k1' })
        .send({ orderId: order.id, method: 'CARD' });

    const first = await send();
    expect(first.status).toBe(201);
    expect(Object.keys(first.body)).toEqual(['txnRef', 'payUrl']);
    expect(first.body.payUrl).toContain('vnp_BankCode=VNBANK');
    expect((await send()).body).toEqual(first.body);
    expect(fake.tables.payment).toHaveLength(1);
  });

  it('API-T28: GET /payments/vnpay-return: sai chữ ký 400; VNPay xác nhận thì PAID', async () => {
    const order = fake.addOrder();
    const created = await http()
      .post('/payments')
      .set({ ...auth(), 'Idempotency-Key': 'k1' })
      .send({ orderId: order.id, method: 'WALLET' });
    const params = gateway.callback(created.body.txnRef, order.total);

    const wrong = await http()
      .get('/payments/vnpay-return')
      .query({ ...params, vnp_SecureHash: 'sai' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('Chữ ký VNPay không hợp lệ');

    gateway.results.set(created.body.txnRef, 'SUCCESS');
    const ok = await http().get('/payments/vnpay-return').query(params);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: 'PAID', code: order.code });
  });

  it('API-T29: GET /payments/vnpay-ipn trả mã theo quy định VNPay', async () => {
    const wrong = await http()
      .get('/payments/vnpay-ipn')
      .query({ vnp_TxnRef: 'KHONGCO', vnp_SecureHash: 'sai' });
    expect(wrong.body).toEqual({ RspCode: '97', Message: 'Invalid signature' });

    const missing = await http()
      .get('/payments/vnpay-ipn')
      .query(gateway.callback('KHONGCO', 1000));
    expect(missing.body.RspCode).toBe('01');
  });

  it('API-T30: POST /promotions/validate: mã hợp lệ 200 kèm số tiền giảm; mã sai 400; thiếu JWT 401', async () => {
    const ok = await http()
      .post('/promotions/validate')
      .set(auth())
      .send({ code: 'giam10', subtotal: 120000 });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ code: 'GIAM10', discount: 12000, total: 108000 });

    const low = await http()
      .post('/promotions/validate')
      .set(auth())
      .send({ code: 'GIAM10', subtotal: 30000 });
    expect(low.status).toBe(400);
    expect(low.body.message).toBe(
      'Đơn hàng chưa đạt tối thiểu 50.000đ để dùng mã này',
    );

    expect(
      (
        await http()
          .post('/promotions/validate')
          .send({ code: 'GIAM10', subtotal: 1 })
      ).status,
    ).toBe(401);
  });
});
