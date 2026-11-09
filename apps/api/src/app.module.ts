import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';

@Module({
  imports: [
    // Đọc biến môi trường từ apps/api/.env hoặc .env ở gốc repo, kiểm tra lúc khởi động (ADR 007)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
  ],
})
export class AppModule {}
