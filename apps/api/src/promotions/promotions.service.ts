import { BadRequestException, Injectable } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatVnd } from '../common/pricing.js';

export type PromotionResult = {
  promotionId: number;
  code: string;
  discount: number;
};

// Kiểm tra mã giảm giá và tính số tiền giảm (BR-07, FR-07).
// Tạo đơn và POST /promotions/validate dùng chung hàm này.
@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(code: string, subtotal: number): Promise<PromotionResult> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Vui lòng nhập mã giảm giá');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { code: normalized },
    });
    if (!promotion) {
      throw new BadRequestException('Mã giảm giá không tồn tại');
    }
    if (!promotion.active) {
      throw new BadRequestException('Mã giảm giá đã ngừng áp dụng');
    }
    if (promotion.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (subtotal < promotion.minOrder) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt tối thiểu ${formatVnd(promotion.minOrder)} để dùng mã này`,
      );
    }

    // PERCENT: giảm theo phần trăm tạm tính; FIXED: giảm số tiền cố định.
    // Số tiền giảm không vượt quá tạm tính.
    const raw =
      promotion.type === DiscountType.PERCENT
        ? Math.floor((subtotal * promotion.value) / 100)
        : promotion.value;
    const discount = Math.min(Math.max(raw, 0), subtotal);

    return { promotionId: promotion.id, code: promotion.code, discount };
  }
}
