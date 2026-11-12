import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

// OrdersModule (ADR 003): tạo đơn, trừ và trả kho, hủy đơn, lịch sử đơn, tự hủy đơn quá hạn
@Module({
  imports: [PromotionsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
