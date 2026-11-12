import { IsInt, IsString, Min } from 'class-validator';

// Body của POST /promotions/validate (FR-07 tiêu chí 1)
export class ValidatePromotionDto {
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  code: string;

  @IsInt({ message: 'Tạm tính phải là số nguyên' })
  @Min(0, { message: 'Tạm tính không được âm' })
  subtotal: number;
}
