import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

function createService(queryRaw: () => Promise<unknown>, version?: string) {
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  const config = { get: () => version } as unknown as ConfigService;
  return new HealthService(prisma, config);
}

describe('HealthService (UT-04 – UT-06)', () => {
  it('trả status ok khi database trả lời', async () => {
    const service = createService(() => Promise.resolve([1]), 'abc123');
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
      version: 'abc123',
    });
  });

  it('báo 503 khi database không trả lời', async () => {
    const service = createService(() => Promise.reject(new Error('down')));
    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('dùng version "local" khi chưa có APP_VERSION', async () => {
    const service = createService(() => Promise.resolve([1]));
    const result = await service.check();
    expect(result.version).toBe('local');
  });
});
