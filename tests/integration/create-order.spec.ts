import { OrderStatus } from '../../apps/api/src/generated/prisma/enums.js';
import {
  createTestApi,
  productId,
  resetDatabase,
  sampleToken,
  SEED_STOCK,
  stocks,
  type TestApi,
  toppingId,
} from './helpers.js';

describe('Tạo đơn trên database thật (INT-T01 – INT-T03)', () => {
  let api: TestApi;
  let khach: string;
  let latte: number;
  let caPheSua: number;
  let sinhToBo: number;
  let shot: number;

  beforeAll(async () => {
    api = await createTestApi();
    khach = await sampleToken(api, 'khach@brewlite.vn');
    latte = await productId(api, 'Latte');
    caPheSua = await productId(api, 'Cà phê sữa đá');
    sinhToBo = await productId(api, 'Sinh tố bơ');
    shot = await toppingId(api, 'Shot espresso');
  });

  afterAll(async () => {
    await api.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(api.prisma);
  });

  const order = (token: string | null, body: object) => {
    const req = api.http().post('/orders');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };
  const statusOf = async (id: number) =>
    (await api.prisma.order.findUniqueOrThrow({ where: { id } })).status;

  it('INT-T01: server tính giá, áp mã giảm giá, trừ đúng nguyên liệu và ghi lại lượng đã trừ (FR-10, FR-11, BR-01, BR-03, BR-04, BR-07)', async () => {
    const before = Date.now();
    const res = await order(khach, {
      items: [
        { productId: latte, size: 'L', toppingIds: [shot], quantity: 2 },
        { productId: caPheSua, size: 'M', toppingIds: [], quantity: 1 },
      ],
      paymentMethod: 'WALLET',
      promotionCode: 'GIAM10',
    });

    expect(res.status).toBe(201);
    // Latte L + shot: 45.000 + 10.000 + 12.000 = 67.000 × 2 ly; Cà phê sữa đá M: 29.000 + 5.000.
    // Tạm tính 168.000, GIAM10 giảm 10% = 16.800, còn 151.200
    expect(res.body.code).toMatch(/^BL-[A-Z0-9]{6}$/);
    expect(res.body.total).toBe(151200);

    const saved = await api.prisma.order.findUniqueOrThrow({
      where: { id: res.body.orderId },
      include: {
        promotion: true,
        items: { orderBy: { id: 'asc' } },
        ingredients: { include: { ingredient: true } },
      },
    });
    expect(saved).toMatchObject({
      status: OrderStatus.PENDING,
      subtotal: 168000,
      discount: 16800,
      total: 151200,
    });
    expect(saved.promotion?.code).toBe('GIAM10');
    // Hạn thanh toán 5 phút kể từ lúc tạo (BR-05)
    const minutes = (saved.expiresAt.getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThanOrEqual(4.9);
    expect(minutes).toBeLessThanOrEqual(5.1);
    expect(
      saved.items.map((i) => [
        i.productName,
        i.size,
        i.toppings,
        i.quantity,
        i.unitPrice,
        i.lineTotal,
      ]),
    ).toEqual([
      ['Latte', 'L', ['Shot espresso'], 2, 67000, 134000],
      ['Cà phê sữa đá', 'M', [], 1, 34000, 34000],
    ]);

    // Latte L: cà phê 18 × 1,3 = 23,4 → 24 g, cộng shot 10 g = 34 g mỗi ly; sữa tươi 200 × 1,3 = 260 ml.
    // Cà phê sữa đá M: cà phê 20 g, sữa đặc 30 ml
    const used = {
      'Cà phê xay': 34 * 2 + 20,
      'Sữa tươi': 260 * 2,
      'Sữa đặc': 30,
    };
    expect(
      Object.fromEntries(
        saved.ingredients.map((row) => [row.ingredient.name, row.amount]),
      ),
    ).toEqual(used);
    expect(await stocks(api.prisma)).toEqual({
      ...SEED_STOCK,
      'Cà phê xay': 3000 - 88,
      'Sữa tươi': 8000 - 520,
      'Sữa đặc': 3000 - 30,
    });
  });

  it('INT-T02: thiếu nguyên liệu, mã giảm giá hết hạn, món không tồn tại, gửi kèm giá, chưa đăng nhập: báo lỗi, không tạo đơn, không trừ nguyên liệu nào (FR-10, FR-11, BR-02, BR-04)', async () => {
    const latteM = { productId: latte, size: 'M', toppingIds: [], quantity: 1 };

    // Latte đủ nguyên liệu nhưng Sinh tố bơ thì không: cả đơn bị từ chối, Latte cũng không bị trừ
    let res = await order(khach, {
      items: [
        latteM,
        { productId: sinhToBo, size: 'S', toppingIds: [], quantity: 1 },
      ],
      paymentMethod: 'CARD',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Món Sinh tố bơ không đủ nguyên liệu, chỉ còn pha được 0 ly',
    );

    res = await order(khach, {
      items: [latteM],
      paymentMethod: 'WALLET',
      promotionCode: 'HETHAN',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Mã giảm giá đã hết hạn');

    res = await order(khach, {
      items: [{ ...latteM, productId: 9999 }],
      paymentMethod: 'WALLET',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Món #9999 không tồn tại');

    // Web không được gửi giá: trường lạ bị từ chối
    res = await order(khach, {
      items: [latteM],
      paymentMethod: 'WALLET',
      total: 1000,
    });
    expect(res.status).toBe(400);

    res = await order(null, { items: [latteM], paymentMethod: 'WALLET' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Vui lòng đăng nhập');

    expect(await api.prisma.order.count()).toBe(0);
    expect(await stocks(api.prisma)).toEqual(SEED_STOCK);
  });

  it('INT-T03: đặt đơn mới khi còn đơn chờ thì đơn cũ bị hủy và trả kho; đơn mới thiếu nguyên liệu thì giữ nguyên đơn cũ (FR-12, BR-06)', async () => {
    const first = await order(khach, {
      items: [{ productId: latte, size: 'M', toppingIds: [], quantity: 1 }],
      paymentMethod: 'WALLET',
    });
    const second = await order(khach, {
      items: [{ productId: caPheSua, size: 'S', toppingIds: [], quantity: 2 }],
      paymentMethod: 'WALLET',
    });
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(await statusOf(first.body.orderId)).toBe(OrderStatus.CANCELLED);
    expect(await statusOf(second.body.orderId)).toBe(OrderStatus.PENDING);

    // Latte của đơn cũ đã được trả lại; chỉ còn trừ phần đơn mới.
    // Cà phê sữa đá S: cà phê 20 × 0,8 = 16 g, sữa đặc 30 × 0,8 = 24 ml mỗi ly
    const afterSecond = {
      ...SEED_STOCK,
      'Cà phê xay': 3000 - 32,
      'Sữa đặc': 3000 - 48,
    };
    expect(await stocks(api.prisma)).toEqual(afterSecond);

    const third = await order(khach, {
      items: [{ productId: sinhToBo, size: 'S', toppingIds: [], quantity: 1 }],
      paymentMethod: 'WALLET',
    });
    expect(third.status).toBe(400);
    expect(await statusOf(second.body.orderId)).toBe(OrderStatus.PENDING);
    expect(await stocks(api.prisma)).toEqual(afterSecond);
  });
});
