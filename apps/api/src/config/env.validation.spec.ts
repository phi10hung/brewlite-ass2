import { validateEnv } from './env.validation.js';

describe('validateEnv (UT-01 – UT-03)', () => {
  it('báo lỗi kèm tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
  });

  it('dùng cổng 4000 khi không khai báo PORT', () => {
    const result = validateEnv({ DATABASE_URL: 'postgresql://x' });
    expect(result.PORT).toBe(4000);
  });

  it('báo lỗi khi PORT không phải số', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://x', PORT: 'abc' }),
    ).toThrow('PORT');
  });
});
