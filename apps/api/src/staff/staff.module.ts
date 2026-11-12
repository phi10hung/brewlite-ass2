import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { StaffIngredientsController } from './staff-ingredients.controller.js';
import { StaffIngredientsService } from './staff-ingredients.service.js';
import { StaffOrdersController } from './staff-orders.controller.js';
import { StaffOrdersService } from './staff-orders.service.js';
import { StaffRevenueController } from './staff-revenue.controller.js';
import { StaffRevenueService } from './staff-revenue.service.js';

// StaffModule (ADR 003): đổi trạng thái đơn tại quầy, doanh thu, kho và nhập kho
@Module({
  imports: [OrdersModule],
  controllers: [
    StaffOrdersController,
    StaffRevenueController,
    StaffIngredientsController,
  ],
  providers: [StaffOrdersService, StaffRevenueService, StaffIngredientsService],
})
export class StaffModule {}
