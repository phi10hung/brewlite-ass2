import { defineConfig } from 'vitest/config';

// Integration test (đề mục 7.2): chạy API thật với database PostgreSQL test riêng.
// Test nằm ở tests/integration (ADR 001) và dùng thư viện của apps/api.
// Chạy: đặt TEST_DATABASE_URL rồi `npm run test:integration` trong apps/api.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    dir: '../../tests/integration',
    include: ['**/*.spec.ts'],
    // Kiểm tra database test, chạy migration và seed một lần trước mọi test
    globalSetup: ['../../tests/integration/global-setup.ts'],
    // Các tệp test dùng chung một database nên chạy lần lượt
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      // Biến môi trường đặt ở đây được ưu tiên hơn tệp .env, nên API không nối nhầm database đang dùng
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      JWT_SECRET: 'khoa-ky-jwt-chi-dung-khi-test',
      ORDER_PAYMENT_MINUTES: '5',
    },
  },
});
