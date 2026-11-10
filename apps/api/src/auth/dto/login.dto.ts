import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Dữ liệu đăng nhập (FR-09)
export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password!: string;
}
