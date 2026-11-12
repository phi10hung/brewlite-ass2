import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';

// PromotionsModule (ADR 003): kiểm tra mã giảm giá.
// POST /promotions/validate được thêm ở #59.
@Module({
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
