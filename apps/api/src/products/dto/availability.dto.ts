import { Type } from 'class-transformer';
import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import {
  CartLineDto,
  OrderItemDto,
} from '../../orders/dto/create-order.dto.js';

// Body của POST /products/availability (FR-05):
// items = các dòng khác trong giỏ (kèm số lượng), line = dòng đang xét
export class AvailabilityDto {
  @IsArray({ message: 'Danh sách món phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsDefined({ message: 'Thiếu dòng cần kiểm tra' })
  @ValidateNested()
  @Type(() => CartLineDto)
  line: CartLineDto;
}
