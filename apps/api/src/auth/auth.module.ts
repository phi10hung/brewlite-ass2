import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// AuthModule (ADR 003): đăng ký, đăng nhập, phát JWT; guard kiểm tra token và vai trò.
// @Global: OrdersModule, PaymentsModule, StaffModule dùng JwtAuthGuard luôn, không cần import lại.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Khóa ký lấy từ biến môi trường (ADR 007), API đã kiểm tra có biến này lúc khởi động
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // JWT hết hạn sau 1 ngày (FR-09, NFR-04)
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') ?? '1d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
