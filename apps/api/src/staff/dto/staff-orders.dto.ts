import { IsIn, IsOptional } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums.js';

const STATUS_MESSAGE = 'Trạng thái đơn hàng không hợp lệ';

// GET /staff/orders?status=
export class StaffOrdersQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus), { message: STATUS_MESSAGE })
  status?: OrderStatus;
}

// PATCH /staff/orders/:id/status
export class UpdateOrderStatusDto {
  @IsIn(Object.values(OrderStatus), { message: STATUS_MESSAGE })
  status: OrderStatus;
}
