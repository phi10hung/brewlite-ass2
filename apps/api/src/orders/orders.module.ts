import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { OrderExpiryService } from './order-expiry.service.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { NoPaymentHooks, PAYMENT_HOOKS } from './payment-hooks.js';

// OrdersModule (ADR 003): tạo đơn, trừ và trả kho, hủy đơn, lịch sử đơn, tự hủy đơn quá hạn
@Module({
  imports: [PromotionsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderExpiryService,
    // #59 đổi thành PaymentsService của PaymentsModule
    { provide: PAYMENT_HOOKS, useClass: NoPaymentHooks },
  ],
  // StaffModule dùng OrdersService.cancel để nhân viên hủy đơn
  exports: [OrdersService],
})
export class OrdersModule {}
