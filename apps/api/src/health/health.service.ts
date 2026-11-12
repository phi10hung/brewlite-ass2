import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

// Health check (ADR 006): kiểm tra database và trả mã commit đang chạy.
// Render, pipeline CD (smoke test) và Docker Compose đều gọi địa chỉ này.
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async check() {
    const version = this.config.get<string>('APP_VERSION') ?? 'local';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', version };
    } catch {
      // 503: API chạy nhưng database không trả lời
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        version,
      });
    }
  }
}
