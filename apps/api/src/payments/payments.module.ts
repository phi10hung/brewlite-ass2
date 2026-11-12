import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment-gateway.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { VnpayGateway } from './vnpay.gateway.js';

// PaymentsModule (ADR 003, ADR 005): thanh toán, idempotency, xác minh kết quả, hoàn tiền, điểm thưởng.
// Gọi VNPay qua interface PaymentGateway; test thay VnpayGateway bằng bản giả lập.
@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_GATEWAY, useClass: VnpayGateway },
  ],
  // OrdersModule dùng PaymentsService qua PaymentHooks
  exports: [PaymentsService],
})
export class PaymentsModule {}
