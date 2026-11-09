import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Kết nối PostgreSQL qua Prisma (ADR 003). Kết nối được mở khi có truy vấn đầu tiên,
// nên API vẫn khởi động được khi database chưa sẵn sàng; /health sẽ báo database "down".
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        connectionTimeoutMillis: 5000,
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
