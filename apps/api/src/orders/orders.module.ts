import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { OrderExpiryService } from './order-expiry.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PAYMENT_HOOKS } from './payment-hooks.js';

// OrdersModule (ADR 003): tạo đơn, trừ và trả kho, hủy đơn, lịch sử đơn, tự hủy đơn quá hạn
@Module({
  imports: [PromotionsModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderExpiryService,
    // Hỏi lại VNPay, trừ điểm, hoàn tiền do PaymentsModule làm (ADR 005)
    { provide: PAYMENT_HOOKS, useExisting: PaymentsService },
  ],
  // StaffModule dùng OrdersService.cancel để nhân viên hủy đơn
  exports: [OrdersService],
})
export class OrdersModule {}
