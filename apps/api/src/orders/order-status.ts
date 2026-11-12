import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums.js';

// Vòng đời đơn (BR-09):
// PENDING → PAID → PREPARING → READY → COMPLETED
// PENDING → PAYMENT_FAILED → PENDING (thanh toán lại)
// Hủy (CANCELLED) được từ PENDING, PAYMENT_FAILED, PAID.
// COMPLETED và CANCELLED là trạng thái kết thúc. Mọi chuyển tiếp khác bị chặn.
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  PAYMENT_FAILED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY],
  READY: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

// Tên trạng thái bằng tiếng Việt, dùng trong câu báo lỗi
export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang pha chế',
  READY: 'Chờ lấy đồ',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// Đơn còn chờ thanh toán (BR-05, BR-06)
export const WAITING_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// Chuyển sai thì trả 400 (FR-21), ví dụ hủy đơn đang pha chế
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Không thể chuyển đơn từ "${STATUS_LABEL[from]}" sang "${STATUS_LABEL[to]}"`,
    );
  }
}
