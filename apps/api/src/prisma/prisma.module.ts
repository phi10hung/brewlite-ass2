import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Dùng chung một kết nối database cho mọi module
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
