import { IsIn, IsInt, Min } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums.js';

// Body của POST /payments (FR-14 tiêu chí 1)
export class CreatePaymentDto {
  @IsInt({ message: 'Mã đơn phải là số nguyên' })
  @Min(1, { message: 'Mã đơn không hợp lệ' })
  orderId: number;

  @IsIn(Object.values(PaymentMethod), {
    message: 'Phương thức thanh toán phải là WALLET hoặc CARD',
  })
  method: PaymentMethod;
}
