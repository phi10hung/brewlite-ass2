import { IsInt, Max, Min } from 'class-validator';

// Body của POST /staff/ingredients/:id/restock: số lượng cộng thêm (FR-24)
export class RestockDto {
  @IsInt({ message: 'Số lượng nhập phải là số nguyên' })
  @Min(1, { message: 'Số lượng nhập phải lớn hơn 0' })
  @Max(1_000_000, { message: 'Số lượng nhập tối đa 1.000.000 mỗi lần' })
  amount: number;
}
