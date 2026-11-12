import { execSync } from 'node:child_process';

// Chạy một lần trước mọi integration test: kiểm tra đúng là database test riêng,
// rồi tạo bảng và nạp dữ liệu mẫu bằng chính lệnh migration, seed của API (NFR-17).
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Thiếu TEST_DATABASE_URL: địa chỉ database test riêng (xem apps/api/README.md)',
    );
  }
  // Mỗi test xóa hết đơn hàng: chỉ chạy trên database có tên kết thúc bằng _test,
  // tránh xóa nhầm dữ liệu của database đang dùng
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(
      `Database "${name}" không phải database test: tên phải kết thúc bằng _test`,
    );
  }
  // Lệnh chạy trong apps/api: migrate deploy rồi seed
  execSync('npm run db:setup', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
