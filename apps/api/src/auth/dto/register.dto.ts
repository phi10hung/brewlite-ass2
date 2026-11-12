import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// Dữ liệu đăng ký (FR-08). Chỉ nhận 3 trường; gửi kèm trường khác (ví dụ role) thì
// ValidationPipe trả 400 (BR-02). Tài khoản mới luôn là Khách hàng.
export class RegisterDto {
  @IsString({ message: 'Vui lòng nhập họ tên' })
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  name!: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString({ message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password!: string;
}
