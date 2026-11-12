import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SIZE_EXTRA, type Size } from '../../common/pricing.js';
import { PaymentMethod } from '../../generated/prisma/enums.js';

// Một dòng trong giỏ: món, size, topping. Web không gửi giá (BR-02).
export class CartLineDto {
  @IsInt({ message: 'Mã món phải là số nguyên' })
  productId: number;

  @IsIn(Object.keys(SIZE_EXTRA), { message: 'Size phải là S, M hoặc L' })
  size: Size;

  @IsArray({ message: 'Danh sách topping phải là mảng' })
  @IsInt({ each: true, message: 'Mã topping phải là số nguyên' })
  toppingIds: number[];
}

export class OrderItemDto extends CartLineDto {
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity: number;
}

// Body của POST /orders (FR-10)
export class CreateOrderDto {
  @IsArray({ message: 'Danh sách món phải là mảng' })
  @ArrayNotEmpty({ message: 'Giỏ hàng đang trống' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsIn(Object.values(PaymentMethod), {
    message: 'Phương thức thanh toán phải là WALLET hoặc CARD',
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  promotionCode?: string;
}
