import { OrderStatus } from '../../apps/api/src/generated/prisma/enums.js';
import { OrderExpiryService } from '../../apps/api/src/orders/order-expiry.service.js';
import {
  createTestApi,
  productId,
  resetDatabase,
  sampleToken,
  SEED_STOCK,
  stocks,
  type TestApi,
} from './helpers.js';

describe('Hủy đơn trả kho và vòng đời trạng thái (INT-T05 – INT-T06)', () => {
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
  });

  // Đặt 1 ly Cà phê sữa đá M: trừ 20 g cà phê, 30 ml sữa đặc
  const placeOrder = async () => {
    const res = await api
      .http()
      .post('/orders')
      .set('Authorization', `Bearer ${khach}`)
      .send({
        items: [
          { productId: caPheSua, size: 'M', toppingIds: [], quantity: 1 },
        ],
        paymentMethod: 'WALLET',
      });
    expect(res.status).toBe(201);
    return res.body.orderId as number;
  };
  const afterOneCup = {
    ...SEED_STOCK,
    'Cà phê xay': 3000 - 20,
    'Sữa đặc': 3000 - 30,
  };
  const statusOf = async (id: number) =>
    (await api.prisma.order.findUniqueOrThrow({ where: { id } })).status;
  // Thanh toán do PaymentsModule xác minh với VNPay (integration test thanh toán ở #66);
  // ở đây đặt thẳng trạng thái PAID trong database để thử phần việc của nhân viên
  const markPaid = (id: number) =>
    api.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.PAID },
    });

  it('INT-T05: khách hủy đơn và hệ thống tự hủy đơn quá hạn đều trả lại đúng lượng nguyên liệu đã trừ (FR-11, FR-13, FR-17, BR-04, BR-05)', async () => {
    const first = await placeOrder();
    expect(await stocks(api.prisma)).toEqual(afterOneCup);

    const cancel = await api
      .http()
      .patch(`/orders/${first}/cancel`)
      .set('Authorization', `Bearer ${khach}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe(OrderStatus.CANCELLED);
    expect(await stocks(api.prisma)).toEqual(SEED_STOCK);

    // Đơn thứ hai quá hạn thanh toán: lùi hạn về quá khứ rồi chạy tác vụ tự hủy
    const second = await placeOrder();
    await api.prisma.order.update({
      where: { id: second },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const cancelled = await api.app
      .get(OrderExpiryService)
      .cancelExpiredOrders();
    expect(cancelled).toBe(1);
    expect(await statusOf(second)).toBe(OrderStatus.CANCELLED);
    expect(await stocks(api.prisma)).toEqual(SEED_STOCK);
  });

  it('INT-T06: nhân viên đổi trạng thái đúng vòng đời, hai nhân viên bấm cùng lúc thì chỉ một người thành công, hủy đơn PAID thì trả kho (FR-21, FR-22, BR-09, BR-10, BR-11)', async () => {
    const id = await placeOrder();
    await markPaid(id);
    const setStatus = (token: string, status: string) =>
      api
        .http()
        .patch(`/staff/orders/${id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });

    // Khách hàng gọi API của nhân viên: 403
    const forbidden = await setStatus(khach, 'PREPARING');
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toBe('Chỉ nhân viên được truy cập');

    // Hai nhân viên cùng bấm "Pha chế": đúng một yêu cầu thành công,
    // yêu cầu kia bị từ chối vì trạng thái đã đổi (409, hoặc 400 nếu đọc sau khi đơn đã đổi)
    const both = await Promise.all([
      setStatus(nhanVien, 'PREPARING'),
      setStatus(nhanVien, 'PREPARING'),
    ]);
    const codes = both.map((res) => res.status).sort();
    expect(codes[0]).toBe(200);
    expect([400, 409]).toContain(codes[1]);
    expect(await statusOf(id)).toBe(OrderStatus.PREPARING);

    // Không hủy được đơn đang pha chế, không được tự đặt PAID
    const cancelPreparing = await setStatus(nhanVien, 'CANCELLED');
    expect(cancelPreparing.status).toBe(400);
    expect(cancelPreparing.body.message).toBe(
      'Nhân viên chỉ hủy được đơn đã thanh toán',
    );
    const setPaid = await setStatus(nhanVien, 'PAID');
    expect(setPaid.status).toBe(400);
    expect(setPaid.body.message).toBe(
      'Nhân viên không được chuyển đơn sang trạng thái này',
    );

    expect((await setStatus(nhanVien, 'READY')).status).toBe(200);
    const done = await setStatus(nhanVien, 'COMPLETED');
    expect(done.status).toBe(200);
    expect(done.body.status).toBe(OrderStatus.COMPLETED);
    // Đơn hoàn thành giữ nguyên lượng nguyên liệu đã dùng
    expect(await stocks(api.prisma)).toEqual(afterOneCup);

    // Đơn PAID khác bị nhân viên hủy: trả lại nguyên liệu của đơn đó (FR-22)
    const second = await placeOrder();
    await markPaid(second);
    const cancel = await api
      .http()
      .patch(`/staff/orders/${second}/status`)
      .set('Authorization', `Bearer ${nhanVien}`)
      .send({ status: 'CANCELLED' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe(OrderStatus.CANCELLED);
    expect(await stocks(api.prisma)).toEqual(afterOneCup);
  });
});
