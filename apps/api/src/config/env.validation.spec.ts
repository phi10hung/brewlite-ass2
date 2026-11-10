import { validateEnv } from './env.validation.js';

const BASE = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'khoa-test' };

describe('validateEnv (UT-01 – UT-03)', () => {
  it('báo lỗi kèm tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: 'khoa-test' })).toThrow(
      'DATABASE_URL',
    );
  });

  it('dùng cổng 4000 khi không khai báo PORT', () => {
    const result = validateEnv(BASE);
    expect(result.PORT).toBe(4000);
  });

  it('báo lỗi khi PORT không phải số', () => {
    expect(() => validateEnv({ ...BASE, PORT: 'abc' })).toThrow('PORT');
  });
});

describe('validateEnv – khóa JWT (UT-24)', () => {
  it('báo lỗi kèm tên biến khi thiếu JWT_SECRET, không in giá trị biến khác', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://bi-mat' })).toThrow(
      'JWT_SECRET',
    );
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://bi-mat' }),
    ).not.toThrow('bi-mat');
  });
});
