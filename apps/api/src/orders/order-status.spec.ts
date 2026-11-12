import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums.js';
import { generateOrderCode } from './order-code.js';
import { assertTransition, canTransition } from './order-status.js';

const {
  PENDING,
  PAYMENT_FAILED,
  PAID,
  PREPARING,
  READY,
  COMPLETED,
  CANCELLED,
} = OrderStatus;

describe('Vòng đời đơn BR-09 (UT-36 – UT-39)', () => {
  it('UT-36: cho phép luồng chính và thanh toán lại', () => {
    expect(canTransition(PENDING, PAID)).toBe(true);
    expect(canTransition(PAID, PREPARING)).toBe(true);
    expect(canTransition(PREPARING, READY)).toBe(true);
    expect(canTransition(READY, COMPLETED)).toBe(true);
    expect(canTransition(PENDING, PAYMENT_FAILED)).toBe(true);
    expect(canTransition(PAYMENT_FAILED, PENDING)).toBe(true);
  });

  it('UT-37: chỉ hủy được từ PENDING, PAYMENT_FAILED, PAID', () => {
    const canCancel = Object.values(OrderStatus).filter((s) =>
      canTransition(s, CANCELLED),
    );
    expect(canCancel).toEqual([PENDING, PAYMENT_FAILED, PAID]);
  });

  it('UT-38: chuyển sai báo 400 kèm tên trạng thái tiếng Việt; COMPLETED, CANCELLED là trạng thái kết thúc', () => {
    expect(() => assertTransition(PREPARING, CANCELLED)).toThrow(
      new BadRequestException(
        'Không thể chuyển đơn từ "Đang pha chế" sang "Đã hủy"',
      ),
    );
    expect(() => assertTransition(PENDING, PREPARING)).toThrow(
      BadRequestException,
    );
    for (const to of Object.values(OrderStatus)) {
      expect(canTransition(COMPLETED, to)).toBe(false);
      expect(canTransition(CANCELLED, to)).toBe(false);
    }
  });

  it('UT-39: mã đơn dạng BL-XXXXXX, không có ký tự dễ nhầm 0, O, 1, I', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOrderCode()).toMatch(/^BL-[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
