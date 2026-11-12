import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { StaffGuard } from '../auth/staff.guard.js';
import {
  StaffOrdersQueryDto,
  UpdateOrderStatusDto,
} from './dto/staff-orders.dto.js';
import { StaffOrdersService } from './staff-orders.service.js';

const parseOrderId = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('Mã đơn không hợp lệ'),
});

// Chỉ Nhân viên gọi được; khách gọi trả 403 "Chỉ nhân viên được truy cập" (FR-22, BR-10)
@Controller('staff/orders')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffOrdersController {
  constructor(private readonly staffOrders: StaffOrdersService) {}

  @Get()
  list(@Query() query: StaffOrdersQueryDto) {
    return this.staffOrders.list(query.status);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', parseOrderId) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.staffOrders.updateStatus(id, dto.status);
  }
}
