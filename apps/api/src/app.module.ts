import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { StaffModule } from './staff/staff.module.js';

@Module({
  imports: [
    // Đọc biến môi trường từ apps/api/.env hoặc .env ở gốc repo, kiểm tra lúc khởi động (ADR 007)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    // Tác vụ định kỳ: tự hủy đơn quá hạn (FR-13)
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    StaffModule,
  ],
})
export class AppModule {}
