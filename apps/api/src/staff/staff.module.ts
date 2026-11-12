import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { StaffIngredientsController } from './staff-ingredients.controller.js';
import { StaffIngredientsService } from './staff-ingredients.service.js';
import { StaffOrdersController } from './staff-orders.controller.js';
import { StaffOrdersService } from './staff-orders.service.js';

// StaffModule (ADR 003): đổi trạng thái đơn tại quầy, kho và nhập kho
@Module({
  imports: [OrdersModule],
  controllers: [StaffOrdersController, StaffIngredientsController],
  providers: [StaffOrdersService, StaffIngredientsService],
})
export class StaffModule {}
