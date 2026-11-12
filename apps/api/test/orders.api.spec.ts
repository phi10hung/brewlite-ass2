import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createFakeOrderDb } from './fake-order-db.js';

let fake = createFakeOrderDb();
// PrismaService giả: mỗi test dùng một database giả mới
const prisma = new Proxy(
  {},
  { get: (_target, key: string) => fake.db[key] as unknown },
);

const LATTE_M = { productId: 1, size: 'M', toppingIds: [], quantity: 1 };

describe('API đơn hàng, nhân viên, số ly còn pha được (API-T19 – API-T25)', () => {
  let app: INestApplication;
  let khach: string;
  let nhanVien: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    // Cùng cấu hình kiểm tra dữ liệu như src/main.ts (BR-02, NFR-06)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const jwt = app.get(JwtService);
    khach = jwt.sign({ sub: 7, email: 'khach@brewlite.vn', role: 'CUSTOMER' });
    nhanVien = jwt.sign({ sub: 8, email: 'staff@brewlite.vn', role: 'STAFF' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fake = createFakeOrderDb();
  });

  const http = () => request(app.getHttpServer());

  it('API-T19: POST /orders thiếu JWT trả 401', async () => {
    const res = await http()
      .post('/orders')
      .send({ items: [LATTE_M], paymentMethod: 'WALLET' });

    expect(res.status).toBe(401);
    expect(fake.orders).toHaveLength(0);
  });

  it('API-T20: POST /orders dữ liệu sai hoặc gửi kèm giá trả 400 (BR-02)', async () => {
    const empty = await http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({ items: [], paymentMethod: 'MOMO' });
    expect(empty.status).toBe(400);
    expect(empty.body.message).toEqual(
      expect.arrayContaining([
        'Giỏ hàng đang trống',
        'Phương thức thanh toán phải là WALLET hoặc CARD',
      ]),
    );

    const withPrice = await http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({
        items: [{ ...LATTE_M, unitPrice: 1000 }],
        paymentMethod: 'WALLET',
      });
    expect(withPrice.status).toBe(400);
    expect(fake.orders).toHaveLength(0);
  });

  it('API-T21: POST /orders hợp lệ trả 201 { orderId, code, total, expiresAt }, đơn PENDING', async () => {
    const res = await http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({ items: [LATTE_M], paymentMethod: 'CARD' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      orderId: 1,
      code: expect.stringMatching(/^BL-[A-Z2-9]{6}$/),
      total: 50000,
      expiresAt: expect.any(String),
    });
    expect(fake.orders[0]).toMatchObject({ userId: 7, status: 'PENDING' });
  });

  it('API-T22: GET /orders/:id mã không phải số trả 400, đơn của người khác trả 404', async () => {
    const other = fake.addOrder(99, 'PENDING');

    const bad = await http()
      .get('/orders/abc')
      .set('Authorization', `Bearer ${khach}`);
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Mã đơn không hợp lệ');

    const notMine = await http()
      .get(`/orders/${other.id}`)
      .set('Authorization', `Bearer ${khach}`);
    expect(notMine.status).toBe(404);
    expect(notMine.body.message).toBe('Không tìm thấy đơn hàng');
  });

  it('API-T23: PATCH /orders/:id/cancel hủy đơn của mình, trả mã đơn và CANCELLED', async () => {
    const mine = fake.addOrder(7, 'PENDING', [
      { ingredientId: 2, amount: 200 },
    ]);

    const res = await http()
      .patch(`/orders/${mine.id}/cancel`)
      .set('Authorization', `Bearer ${khach}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: mine.code, status: 'CANCELLED' });
    expect(fake.ingredients.get(2)?.stock).toBe(5200);
  });

  it('API-T24: /staff/orders: khách gọi trả 403, trạng thái sai trả 400, nhân viên đổi được trạng thái', async () => {
    const paid = fake.addOrder(7, 'PAID');

    const forbidden = await http()
      .get('/staff/orders')
      .set('Authorization', `Bearer ${khach}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toBe('Chỉ nhân viên được truy cập');

    const badFilter = await http()
      .get('/staff/orders?status=ABC')
      .set('Authorization', `Bearer ${nhanVien}`);
    expect(badFilter.status).toBe(400);

    const badStatus = await http()
      .patch(`/staff/orders/${paid.id}/status`)
      .set('Authorization', `Bearer ${nhanVien}`)
      .send({ status: 'DANG_LAM' });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.message).toEqual([
      'Trạng thái đơn hàng không hợp lệ',
    ]);

    const ok = await http()
      .patch(`/staff/orders/${paid.id}/status`)
      .set('Authorization', `Bearer ${nhanVien}`)
      .send({ status: 'PREPARING' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('PREPARING');
  });

  it('API-T25: POST /products/availability trả maxQuantity, không cần đăng nhập (FR-05)', async () => {
    // Sữa 5.000 ml; giỏ đã có 5 ly Latte M (1.000 ml) → Latte M còn thêm được 20 ly
    const res = await http()
      .post('/products/availability')
      .send({
        items: [{ ...LATTE_M, quantity: 5 }],
        line: { productId: 1, size: 'M', toppingIds: [] },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ maxQuantity: 20 });

    const missing = await http()
      .post('/products/availability')
      .send({ items: [] });
    expect(missing.status).toBe(400);
  });
});
