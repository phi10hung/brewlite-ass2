import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Đọc biến môi trường từ apps/api/.env hoặc .env ở gốc repo (khi chạy ở máy cá nhân).
// Trong Docker và production, biến đã có sẵn nên không cần tệp .env.
config({ path: ['.env', '../../.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/seed/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
