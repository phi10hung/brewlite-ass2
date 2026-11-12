import { PaymentStatus } from '../generated/prisma/enums.js';
import type { RefundStatus } from '../generated/prisma/enums.js';

// Các cột của đơn trả về cho web (khách và nhân viên dùng chung)
export const ORDER_SELECT = {
  id: true,
  code: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  paymentMethod: true,
  expiresAt: true,
  createdAt: true,
  promotion: { select: { code: true } },
  items: {
    orderBy: { id: 'asc' },
    select: {
      productId: true,
      productName: true,
      size: true,
      toppings: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
  // Lần thanh toán thành công gần nhất, để biết tình trạng hoàn tiền (FR-20 tiêu chí 4)
  payments: {
    where: { status: PaymentStatus.SUCCESS },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { refundStatus: true },
  },
} as const;

type OrderRow = {
  promotion: { code: string } | null;
  payments: { refundStatus: RefundStatus | null }[];
};

// Đổi quan hệ promotion, payments thành 2 trường promotionCode, refundStatus cho web dễ dùng
export function toOrderView<T extends OrderRow>(order: T) {
  const { promotion, payments, ...rest } = order;
  return {
    ...rest,
    promotionCode: promotion?.code ?? null,
    refundStatus: payments[0]?.refundStatus ?? null,
  };
}
