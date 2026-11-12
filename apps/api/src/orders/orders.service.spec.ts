import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  CA_PHE,
  createFakeOrderDb,
  KEM,
  SUA,
} from '../../test/fake-order-db.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PromotionsService } from '../promotions/promotions.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';
import type { PaymentHooks } from './payment-hooks.js';

const KHACH = 7;
const LATTE = 1;
const BAC_XIU = 2;
const KEM_CHEESE = 7;

function setup(stock?: Record<number, number>) {
  const fake = createFakeOrderDb(stock);
  const promotions = {
    calculate: vi.fn().mockResolvedValue({
      promotionId: 1,
      code: 'GIAM10',
      discount: 10000,
    }),
  };
  const payments = {
    checkBeforeExpire: vi.fn(),
    revokePoints: vi.fn().mockResolvedValue(undefined),
    refund: vi.fn().mockResolvedValue(undefined),
  };
  const config = { get: () => '5' };
  const service = new OrdersService(
    fake.db as unknown as PrismaService,
    promotions as unknown as PromotionsService,
    config as unknown as ConfigService,
    payments as PaymentHooks,
  );
  return { ...fake, service, promotions, payments };
}

const order = (
  items: CreateOrderDto['items'],
  promotionCode?: string,
): CreateOrderDto => ({ items, paymentMethod: 'WALLET', promotionCode });
const latte = (
  size: 'S' | 'M' | 'L',
  quantity = 1,
  toppingIds: number[] = [],
) => ({
  productId: LATTE,
  size,
  toppingIds,
  quantity,
});

describe('OrdersService.create (UT-40 – UT-48)', () => {
  it('UT-40: server tính giá theo BR-01, topping gửi trùng chỉ tính một lần, trừ mã giảm giá', async () => {
    const { service, orders, promotions } = setup();

    const result = await service.create(
      KHACH,
      order([latte('L', 2, [KEM_CHEESE, KEM_CHEESE])], 'giam10'),
    );

    // (45.000 + 10.000 size L + 12.000 kem cheese) × 2 = 134.000; giảm 10.000
    const data = orders[0].data;
    expect(data.items.create[0]).toEqual({
      productId: LATTE,
      productName: 'Latte',
      size: 'L',
      toppings: ['Kem cheese'],
      quantity: 2,
      unitPrice: 67000,
      lineTotal: 134000,
    });
    expect(data).toMatchObject({
      subtotal: 134000,
      discount: 10000,
      total: 124000,
      status: 'PENDING',
      promotionId: 1,
      userId: KHACH,
    });
    expect(promotions.calculate).toHaveBeenCalledWith('giam10', 134000);
    expect(Object.keys(result)).toEqual([
      'orderId',
      'code',
      'total',
      'expiresAt',
    ]);
    // Hạn thanh toán 5 phút (BR-05)
    const minutes = (result.expiresAt.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(4.9);
    expect(minutes).toBeLessThanOrEqual(5);
  });

  it('UT-41: trừ nguyên liệu theo size và topping, ghi lại lượng đã trừ', async () => {
    const { service, ingredients, orders } = setup();

    await service.create(KHACH, order([latte('L', 2, [KEM_CHEESE])]));

    // Size L: 18 × 1,3 = 23,4 → 24 g; 200 × 1,3 = 260 ml; topping không nhân size
    expect(ingredients.get(CA_PHE)?.stock).toBe(1000 - 48);
    expect(ingredients.get(SUA)?.stock).toBe(5000 - 520);
    expect(ingredients.get(KEM)?.stock).toBe(1000 - 60);
    expect(orders[0].ingredients).toEqual(
      expect.arrayContaining([
        { ingredientId: CA_PHE, amount: 48 },
        { ingredientId: SUA, amount: 520 },
        { ingredientId: KEM, amount: 60 },
      ]),
    );
  });

  it('UT-42: thiếu nguyên liệu trả 400 đúng câu FR-11, không tạo đơn, không trừ nguyên liệu nào', async () => {
    // Sữa còn 500 ml: Latte M cần 200 ml/ly → còn pha được 2 ly
    const { service, ingredients, orders } = setup({
      [CA_PHE]: 1000,
      [SUA]: 500,
      [KEM]: 1000,
    });

    await expect(service.create(KHACH, order([latte('M', 3)]))).rejects.toThrow(
      new BadRequestException(
        'Món Latte không đủ nguyên liệu, chỉ còn pha được 2 ly',
      ),
    );
    expect(orders).toHaveLength(0);
    expect(ingredients.get(CA_PHE)?.stock).toBe(1000);
    expect(ingredients.get(SUA)?.stock).toBe(500);
  });

  it('UT-43: đã có đơn chờ thì hủy đơn cũ, trả nguyên liệu đơn cũ và trừ cho đơn mới (BR-06)', async () => {
    const { service, ingredients, addOrder } = setup({
      [CA_PHE]: 0,
      [SUA]: 0,
      [KEM]: 0,
    });
    // Đơn cũ đã giữ toàn bộ cà phê và sữa
    const old = addOrder(KHACH, 'PAYMENT_FAILED', [
      { ingredientId: CA_PHE, amount: 18 },
      { ingredientId: SUA, amount: 200 },
    ]);

    await service.create(KHACH, order([{ ...latte('M'), productId: BAC_XIU }]));

    expect(old.status).toBe('CANCELLED');
    // Bạc xỉu M: 10 g cà phê, 100 ml sữa
    expect(ingredients.get(CA_PHE)?.stock).toBe(8);
    expect(ingredients.get(SUA)?.stock).toBe(100);
  });

  it('UT-44: đơn mới không đủ nguyên liệu thì giữ nguyên đơn chờ cũ và kho (FR-12 tiêu chí 2)', async () => {
    const { service, ingredients, addOrder } = setup({
      [CA_PHE]: 0,
      [SUA]: 0,
      [KEM]: 0,
    });
    const old = addOrder(KHACH, 'PENDING', [
      { ingredientId: CA_PHE, amount: 18 },
      { ingredientId: SUA, amount: 200 },
    ]);

    await expect(service.create(KHACH, order([latte('M', 2)]))).rejects.toThrow(
      BadRequestException,
    );
    expect(old.status).toBe('PENDING');
    expect(ingredients.get(SUA)?.stock).toBe(0);
  });

  it('UT-45: version đổi giữa chừng thì thử lại và vẫn tạo được đơn', async () => {
    const { service, db, orders } = setup();
    // Lần ghi đầu tiên giả như có yêu cầu khác vừa sửa nguyên liệu
    const realUpdate = db.ingredient.updateMany.getMockImplementation();
    db.ingredient.updateMany.mockImplementationOnce(() =>
      Promise.resolve({ count: 0 }),
    );
    db.ingredient.updateMany.mockImplementation(realUpdate);

    await service.create(KHACH, order([latte('M')]));

    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(orders).toHaveLength(1);
  });

  it('UT-46: thử lại 10 lần vẫn đụng độ thì trả 409 đúng câu FR-11', async () => {
    const { service, db, orders } = setup();
    db.ingredient.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.create(KHACH, order([latte('M')]))).rejects.toThrow(
      new ConflictException('Hệ thống đang bận, vui lòng đặt lại sau giây lát'),
    );
    expect(db.$transaction).toHaveBeenCalledTimes(10);
    expect(orders).toHaveLength(0);
  });

  it('UT-47: 6 khách đặt cùng lúc khi kho chỉ đủ 2 ly: đúng 2 đơn, kho không âm (NFR-02)', async () => {
    // Latte M cần 200 ml sữa; còn 400 ml = 2 ly
    const { service, ingredients, orders } = setup({
      [CA_PHE]: 1000,
      [SUA]: 400,
      [KEM]: 1000,
    });

    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6].map((userId) =>
        service.create(userId, order([latte('M')])),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(orders).toHaveLength(2);
    expect(ingredients.get(SUA)?.stock).toBe(0);
  });

  it('UT-48: món hoặc topping không tồn tại trả 400', async () => {
    const { service } = setup();

    await expect(
      service.create(KHACH, order([{ ...latte('M'), productId: 99 }])),
    ).rejects.toThrow(new BadRequestException('Món #99 không tồn tại'));
    await expect(
      service.create(KHACH, order([latte('M', 1, [99])])),
    ).rejects.toThrow(new BadRequestException('Topping #99 không tồn tại'));
  });
});

describe('OrdersService xem và hủy đơn (UT-49 – UT-52)', () => {
  it('UT-49: khách hủy đơn chờ: CANCELLED, trả lại đúng lượng nguyên liệu (BR-04)', async () => {
    const { service, ingredients, addOrder, payments } = setup();
    const o = addOrder(KHACH, 'PENDING', [{ ingredientId: SUA, amount: 260 }]);

    const result = await service.cancel(o.id, 'CUSTOMER', KHACH);

    expect(result.status).toBe('CANCELLED');
    expect(ingredients.get(SUA)?.stock).toBe(5260);
    expect(payments.refund).not.toHaveBeenCalled();
  });

  it('UT-50: hủy đơn PAID: trừ điểm trong transaction, sau đó gửi hoàn tiền (BR-08, BR-13)', async () => {
    const { service, addOrder, payments } = setup();
    const o = addOrder(KHACH, 'PAID', [{ ingredientId: SUA, amount: 200 }]);

    await service.cancel(o.id, 'CUSTOMER', KHACH);

    expect(payments.revokePoints).toHaveBeenCalledWith(expect.anything(), o.id);
    expect(payments.refund).toHaveBeenCalledWith(o.id);
  });

  it('UT-51: trạng thái vừa bị yêu cầu khác đổi thì 409, kho không đổi (BR-11)', async () => {
    const { service, db, ingredients, addOrder } = setup();
    const o = addOrder(KHACH, 'PAID', [{ ingredientId: SUA, amount: 200 }]);
    db.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel(o.id, 'CUSTOMER', KHACH)).rejects.toThrow(
      new ConflictException('Đơn đã thay đổi trạng thái, vui lòng tải lại'),
    );
    await expect(service.cancel(o.id, 'STAFF')).rejects.toThrow(
      new ConflictException('Đơn vừa đổi trạng thái, vui lòng tải lại'),
    );
    expect(ingredients.get(SUA)?.stock).toBe(5000);
  });

  it('UT-52: đơn của khách khác trả 404; nhân viên hủy đơn chưa thanh toán trả 400', async () => {
    const { service, addOrder } = setup();
    const o = addOrder(KHACH, 'PENDING');

    await expect(service.findOne(99, o.id)).rejects.toThrow(
      new NotFoundException('Không tìm thấy đơn hàng'),
    );
    await expect(service.cancel(o.id, 'CUSTOMER', 99)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.cancel(o.id, 'STAFF')).rejects.toThrow(
      new BadRequestException('Nhân viên chỉ hủy được đơn đã thanh toán'),
    );
  });
});
