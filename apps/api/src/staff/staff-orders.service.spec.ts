import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createFakeOrderDb } from '../../test/fake-order-db.js';
import type { OrdersService } from '../orders/orders.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { StaffOrdersService } from './staff-orders.service.js';

function setup() {
  const fake = createFakeOrderDb();
  const orders = { cancel: vi.fn().mockResolvedValue({}) };
  const service = new StaffOrdersService(
    fake.db as unknown as PrismaService,
    orders as unknown as OrdersService,
  );
  return { ...fake, service, orders };
}

describe('Nhân viên đổi trạng thái đơn FR-22 (UT-55 – UT-57)', () => {
  it('UT-55: PAID → PREPARING → READY → COMPLETED; không được tự đặt PAID; bước sai trả 400', async () => {
    const { service, addOrder } = setup();
    const paid = addOrder(1, 'PAID');
    const pending = addOrder(2, 'PENDING');

    expect((await service.updateStatus(paid.id, 'PREPARING')).status).toBe(
      'PREPARING',
    );
    expect((await service.updateStatus(paid.id, 'READY')).status).toBe('READY');
    const done = await service.updateStatus(paid.id, 'COMPLETED');
    expect(done).toMatchObject({
      status: 'COMPLETED',
      customerName: 'Khách 1',
    });

    await expect(service.updateStatus(pending.id, 'PAID')).rejects.toThrow(
      new BadRequestException(
        'Nhân viên không được chuyển đơn sang trạng thái này',
      ),
    );
    await expect(service.updateStatus(pending.id, 'PREPARING')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.updateStatus(99, 'READY')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('UT-56: đơn vừa bị nhân viên khác đổi trạng thái thì 409 đúng câu FR-22', async () => {
    const { service, db, addOrder } = setup();
    const paid = addOrder(1, 'PAID');
    db.order.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.updateStatus(paid.id, 'PREPARING')).rejects.toThrow(
      new ConflictException('Đơn vừa đổi trạng thái, vui lòng tải lại'),
    );
    expect(paid.status).toBe('PAID');
  });

  it('UT-57: nhân viên hủy đơn dùng hàm hủy chung (trả kho, trừ điểm, hoàn tiền)', async () => {
    const { service, orders, addOrder } = setup();
    const paid = addOrder(1, 'PAID');

    await service.updateStatus(paid.id, 'CANCELLED');

    expect(orders.cancel).toHaveBeenCalledWith(paid.id, 'STAFF');
  });
});
