import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Cần JWT và header Idempotency-Key (FR-14, FR-15)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreatePaymentDto,
    @Ip() ipAddr: string,
  ) {
    return this.payments.create(user.userId, idempotencyKey, dto, ipAddr);
  }

  // Trang /payment/result của web gửi lại tham số VNPay để server xác minh (FR-19 tiêu chí 1).
  // Không cần JWT: kết quả được kiểm tra bằng chữ ký và truy vấn lại VNPay.
  @Get('vnpay-return')
  vnpayReturn(@Query() query: Record<string, unknown>) {
    return this.payments.handleReturn(query);
  }

  // VNPay gọi thẳng tới đây (IPN)
  @Get('vnpay-ipn')
  vnpayIpn(@Query() query: Record<string, unknown>) {
    return this.payments.handleIpn(query);
  }
}
