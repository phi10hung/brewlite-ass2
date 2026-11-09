// Kiểm tra biến môi trường ngay lúc API khởi động (ADR 007).
// Thiếu biến bắt buộc thì dừng ngay và báo tên biến, không in giá trị của biến.
const REQUIRED_KEYS = ['DATABASE_URL'];

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_KEYS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`);
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Biến môi trường PORT phải là số nguyên dương');
  }

  return { ...config, PORT: port };
}
