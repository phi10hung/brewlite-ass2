import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { StaffOrdersController } from './staff-orders.controller.js';
import { StaffOrdersService } from './staff-orders.service.js';

// StaffModule (ADR 003): đổi trạng thái đơn tại quầy.
// Doanh thu, kho và nhập kho được thêm ở #57.
@Module({
  imports: [OrdersModule],
  controllers: [StaffOrdersController],
  providers: [StaffOrdersService],
})
export class StaffModule {}
