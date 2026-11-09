import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// API-T10: GET /health (NFR-09).
// Thay database thật bằng bản giả để test chạy được ở mọi máy và trong CI.
describe('GET /health (API-T10)', () => {
  let app: INestApplication;
  const prisma = { $queryRaw: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('trả 200 khi database trả lời', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([1]);
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('trả 503 khi database không trả lời', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('down'));
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', database: 'down' });
  });
});
