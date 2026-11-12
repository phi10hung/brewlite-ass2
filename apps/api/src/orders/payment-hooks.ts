import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

// Kết quả hỏi lại VNPay trước khi tự hủy đơn quá hạn (BR-05, FR-13):
// PAID    = đã có tiền, PaymentsModule đã ghi nhận, không hủy
// UNPAID  = chưa có tiền, được hủy và trả kho
// UNKNOWN = chưa xác minh được (mất mạng, VNPay lỗi), để lần kiểm tra sau
export type ExpireCheck = 'PAID' | 'UNPAID' | 'UNKNOWN';

// Những việc của PaymentsModule mà OrdersModule cần gọi (ADR 005).
// OrdersModule chỉ biết interface này; PaymentsModule hiện thực ở #59.
export interface PaymentHooks {
  // Hỏi lại VNPay trước khi tự hủy đơn quá hạn
  checkBeforeExpire(orderId: number): Promise<ExpireCheck>;
  // Trừ lại điểm của đơn đã PAID bị hủy (BR-08), chạy trong transaction hủy đơn
  revokePoints(tx: Prisma.TransactionClient, orderId: number): Promise<void>;
  // Gửi hoàn tiền sau khi transaction hủy đơn xong (BR-13); lỗi thì PaymentsModule tự ghi "Đang hoàn tiền"
  refund(orderId: number): Promise<void>;
}

export const PAYMENT_HOOKS = 'PAYMENT_HOOKS';

// Bản mặc định khi chưa có PaymentsModule: chưa có giao dịch nào, nên mọi đơn quá hạn
// đều chưa có tiền, và chưa có đơn nào PAID để trừ điểm hay hoàn tiền.
// #59 thay bản này bằng PaymentsService trong orders.module.ts.
@Injectable()
export class NoPaymentHooks implements PaymentHooks {
  checkBeforeExpire(): Promise<ExpireCheck> {
    return Promise.resolve('UNPAID');
  }

  revokePoints(): Promise<void> {
    return Promise.resolve();
  }

  refund(): Promise<void> {
    return Promise.resolve();
  }
}
