import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createFakePaymentDb } from '../../test/fake-payment-db.js';
import { FakePaymentGateway } from '../../test/fake-payment-gateway.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';

const KHACH = 7;

function setup() {
  const fake = createFakePaymentDb();
  const gateway = new FakePaymentGateway();
  const service = new PaymentsService(
    fake.db as unknown as PrismaService,
    gateway,
  );
  return { ...fake, gateway, service };
}

const pay = (
  service: PaymentsService,
  orderId: number,
  key: string | undefined = 'khoa-1',
  method: 'WALLET' | 'CARD' = 'WALLET',
) => service.create(KHACH, key, { orderId, method }, '127.0.0.1');

describe('Tạo thanh toán FR-14 – FR-16 (UT-63 – UT-65)', () => {
  it('UT-63: thiếu Idempotency-Key 400; đơn người khác 404; đơn đã thanh toán 400; quá hạn 400', async () => {
    const { service, addOrder } = setup();
    const mine = addOrder();
    const other = addOrder({ userId: 99 });
    const paid = addOrder({ status: 'PAID' });
    const expired = addOrder({ expiresAt: new Date(Date.now() - 1000) });

    await expect(pay(service, mine.id, '  ')).rejects.toThrow(
      new BadRequestException('Thiếu header Idempotency-Key'),
    );
    await expect(pay(service, other.id)).rejects.toThrow(NotFoundException);
    await expect(pay(service, paid.id)).rejects.toThrow(BadRequestException);
    await expect(pay(service, expired.id)).rejects.toThrow(
      new BadRequestException('Đơn đã hết thời gian thanh toán'),
    );
  });

  it('UT-64: cùng khóa trả lại giao dịch cũ; khóa dùng cho đơn hoặc phương thức khác 409; 5 yêu cầu cùng lúc chỉ tạo 1 giao dịch', async () => {
    const { service, addOrder, tables } = setup();
    const a = addOrder();
    const b = addOrder();

    const first = await pay(service, a.id, 'khoa-1');
    expect(await pay(service, a.id, 'khoa-1')).toEqual(first);
    await expect(pay(service, a.id, 'khoa-1', 'CARD')).rejects.toThrow(
      new ConflictException(
        'Idempotency-Key đã được dùng cho một thanh toán khác',
      ),
    );
    await expect(pay(service, b.id, 'khoa-1')).rejects.toThrow(
      ConflictException,
    );

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map(() => pay(service, b.id, 'khoa-2', 'CARD')),
    );
    expect(new Set(results.map((r) => r.txnRef)).size).toBe(1);
    expect(
      tables.payment.filter((p) => p.idempotencyKey === 'khoa-2'),
    ).toHaveLength(1);
  });

  it('UT-65: số tiền lấy từ đơn, Thẻ gửi VNBANK; thanh toán lại đưa đơn về PENDING, không gia hạn', async () => {
    const { service, addOrder, gateway } = setup();
    const order = addOrder({ status: 'PAYMENT_FAILED' });
    const expiresAt = order.expiresAt;

    await pay(service, order.id, 'khoa-moi', 'CARD');

    expect(gateway.payUrls[0]).toMatchObject({
      amount: 125000,
      bankCode: 'VNBANK',
      expireDate: expiresAt,
    });
    expect(order.status).toBe('PENDING');
    expect(order.expiresAt).toBe(expiresAt);
  });
});

describe('Xác minh kết quả, điểm thưởng, hoàn tiền (UT-66 – UT-74)', () => {
  async function paidSetup() {
    const s = setup();
    const order = s.addOrder();
    const { txnRef } = await pay(s.service, order.id);
    return { ...s, order, txnRef };
  }

  it('UT-66: sai chữ ký hoặc sai số tiền thì 400, đơn không đổi', async () => {
    const { service, gateway, order, txnRef } = await paidSetup();
    gateway.results.set(txnRef, 'SUCCESS');

    await expect(
      service.handleReturn({
        ...gateway.callback(txnRef, 125000),
        vnp_SecureHash: 'gia',
      }),
    ).rejects.toThrow(new BadRequestException('Chữ ký VNPay không hợp lệ'));
    await expect(
      service.handleReturn(gateway.callback(txnRef, 1000)),
    ).rejects.toThrow(
      new BadRequestException('Số tiền VNPay không khớp với đơn hàng'),
    );
    expect(order.status).toBe('PENDING');
  });

  it('UT-67: chỉ PAID khi truy vấn lại xác nhận (BR-12); chưa xác nhận thì "Đang kiểm tra thanh toán"', async () => {
    const { service, gateway, order, txnRef } = await paidSetup();

    const checking = await service.handleReturn(
      gateway.callback(txnRef, 125000),
    );
    expect(checking).toMatchObject({
      status: 'PENDING',
      message: 'Đang kiểm tra thanh toán',
    });

    gateway.results.set(txnRef, 'SUCCESS');
    const paid = await service.handleReturn(gateway.callback(txnRef, 125000));
    expect(paid).toEqual({
      orderId: order.id,
      code: order.code,
      status: 'PAID',
      message: 'Thanh toán thành công',
    });
  });

  it('UT-68: Return URL và IPN gửi nhiều lần chỉ cộng điểm một lần (BR-08, BR-12)', async () => {
    const { service, gateway, user, tables, txnRef } = await paidSetup();
    gateway.results.set(txnRef, 'SUCCESS');

    await service.handleReturn(gateway.callback(txnRef, 125000));
    await service.handleReturn(gateway.callback(txnRef, 125000));
    const ipn = await service.handleIpn(gateway.callback(txnRef, 125000));

    // 125.000đ → 12 điểm
    expect(user.loyaltyPoints).toBe(12);
    expect(tables.loyaltyTransaction).toHaveLength(1);
    expect(ipn.RspCode).toBe('02');
    expect(
      (
        await service.handleIpn({
          ...gateway.callback(txnRef, 125000),
          vnp_SecureHash: 'x',
        })
      ).RspCode,
    ).toBe('97');
  });

  it('UT-69: thất bại thì PAYMENT_FAILED kèm lý do; kết quả thất bại cũ không làm đơn đã PAID quay lại', async () => {
    const { service, gateway, addOrder, order, txnRef } = await paidSetup();

    const failed = await service.handleReturn(
      gateway.callback(txnRef, 125000, '24'),
    );
    expect(failed).toMatchObject({
      status: 'PAYMENT_FAILED',
      message: 'Bạn đã hủy giao dịch',
    });

    const paidOrder = addOrder();
    const second = await pay(service, paidOrder.id, 'khoa-2');
    gateway.results.set(second.txnRef, 'SUCCESS');
    await service.handleReturn(gateway.callback(second.txnRef, 125000));
    await service.handleReturn(gateway.callback(second.txnRef, 125000, '24'));
    expect(paidOrder.status).toBe('PAID');
    expect(order.status).toBe('PAYMENT_FAILED');
  });

  it('UT-70: tiền về cho đơn đã hủy: đơn giữ CANCELLED, không cộng điểm, hoàn tiền (BR-13)', async () => {
    const { service, gateway, user, order, txnRef, tables } = await paidSetup();
    order.status = 'CANCELLED';
    gateway.results.set(txnRef, 'SUCCESS');

    const result = await service.handleReturn(gateway.callback(txnRef, 125000));

    expect(result.status).toBe('CANCELLED');
    expect(user.loyaltyPoints).toBe(0);
    expect(gateway.refunds).toEqual([txnRef]);
    expect(tables.payment[0].refundStatus).toBe('SUCCESS');
  });

  it('UT-71: hủy đơn PAID trừ đúng số điểm đã cộng, số dư không âm, không trừ hai lần (BR-08)', async () => {
    const { service, gateway, user, order, txnRef, db } = await paidSetup();
    gateway.results.set(txnRef, 'SUCCESS');
    await service.handleReturn(gateway.callback(txnRef, 125000));
    user.loyaltyPoints = 5; // khách đã dùng bớt điểm

    await db.$transaction((tx: never) => service.revokePoints(tx, order.id));
    await db.$transaction((tx: never) => service.revokePoints(tx, order.id));

    expect(user.loyaltyPoints).toBe(0);
  });

  it('UT-72: hoàn tiền lỗi thì ghi "Đang hoàn tiền", tác vụ 60 giây thử lại đến khi thành công (FR-17)', async () => {
    const { service, gateway, order, txnRef, tables } = await paidSetup();
    gateway.results.set(txnRef, 'SUCCESS');
    await service.handleReturn(gateway.callback(txnRef, 125000));
    gateway.refundOk = false;

    await service.refund(order.id);
    expect(tables.payment[0].refundStatus).toBe('FAILED');

    gateway.refundOk = true;
    expect(await service.retryRefunds()).toBe(1);
    expect(tables.payment[0].refundStatus).toBe('SUCCESS');
    expect(await service.retryRefunds()).toBe(0);
  });

  it('UT-73: trước khi tự hủy đơn: đã trả → PAID; chưa trả → UNPAID; không hỏi được → UNKNOWN (FR-13)', async () => {
    const { service, gateway, addOrder, txnRef, order } = await paidSetup();

    expect(await service.checkBeforeExpire(addOrder().id)).toBe('UNPAID');
    expect(await service.checkBeforeExpire(order.id)).toBe('UNPAID');
    gateway.results.set(txnRef, 'ERROR');
    expect(await service.checkBeforeExpire(order.id)).toBe('UNKNOWN');
    gateway.results.set(txnRef, 'SUCCESS');
    expect(await service.checkBeforeExpire(order.id)).toBe('PAID');
    expect(order.status).toBe('PAID');
  });

  it('UT-74: giao dịch trước chưa rõ kết quả thì không tạo giao dịch mới (FR-16 tiêu chí 4)', async () => {
    const { service, gateway, order, txnRef, tables } = await paidSetup();
    gateway.results.set(txnRef, 'ERROR');

    await expect(pay(service, order.id, 'khoa-2')).rejects.toThrow(
      ConflictException,
    );
    expect(tables.payment).toHaveLength(1);

    // VNPay báo giao dịch trước chưa trả: được tạo giao dịch mới
    gateway.results.set(txnRef, 'NOT_PAID');
    await pay(service, order.id, 'khoa-2');
    expect(tables.payment).toHaveLength(2);
  });
});
