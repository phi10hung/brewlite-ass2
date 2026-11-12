import { randomBytes } from 'node:crypto';

// Bỏ các ký tự dễ nhầm (0/O, 1/I) để khách đọc mã đơn không bị sai
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Mã đơn dạng BL-XXXXXX (FR-10 tiêu chí 4)
export function generateOrderCode(): string {
  let suffix = '';
  for (const byte of randomBytes(6)) {
    suffix += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return `BL-${suffix}`;
}
