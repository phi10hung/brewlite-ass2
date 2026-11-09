#!/bin/sh
# Chạy mỗi khi container API khởi động (ADR 003, ADR 008)
set -e

echo "Chạy migration database..."
npx prisma migrate deploy

echo "Nạp dữ liệu mẫu..."
node dist/seed/seed.js

echo "Bật API ở cổng ${PORT:-4000}"
exec node dist/main.js
