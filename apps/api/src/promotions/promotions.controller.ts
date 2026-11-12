import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ValidatePromotionDto } from './dto/validate-promotion.dto.js';
import { PromotionsService } from './promotions.service.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  // Checkout kiểm tra mã trước khi đặt (FR-07). Mã sai trả 400 kèm lý do tiếng Việt.
  // Khi tạo đơn, server vẫn kiểm tra lại (BR-07).
  @Post('validate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async validate(@Body() dto: ValidatePromotionDto) {
    const { code, discount } = await this.promotions.calculate(
      dto.code,
      dto.subtotal,
    );
    return { code, discount, total: dto.subtotal - discount };
  }
}
