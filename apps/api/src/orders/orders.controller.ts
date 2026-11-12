import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

// Mã đơn không phải số thì trả 400 (FR-20 tiêu chí 2)
const parseOrderId = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('Mã đơn không hợp lệ'),
});

// Mọi API đơn hàng của khách đều cần đăng nhập; thiếu hoặc sai JWT trả 401 (FR-10 tiêu chí 1)
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.userId, dto);
  }

  // Khai báo trước ':id' để "me" không bị hiểu là mã đơn
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', parseOrderId) id: number,
  ) {
    return this.orders.findOne(user.userId, id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', parseOrderId) id: number) {
    return this.orders.cancel(id, 'CUSTOMER', user.userId);
  }
}
