#!/usr/bin/env bash
# Smoke test sau khi triển khai (đề mục 7.3, ADR 008 bước 7, NFR-19).
# SMK-01: gọi GET <API>/health đến khi trả 200, "status":"ok" và "version" đúng mã commit vừa triển khai.
#         Render cần vài phút để kéo image và khởi động (API gói miễn phí có thể đang ngủ), nên chờ tối đa 10 phút.
# SMK-02: mở trang chủ web, phải trả 200.
# Sai hoặc hết thời gian thì thoát mã 1: pipeline báo đỏ và dừng.
#
# Cách dùng: bash .github/scripts/smoke-test.sh <địa chỉ API> <địa chỉ web> <mã commit>
# Ví dụ:     bash .github/scripts/smoke-test.sh https://brewlite-api-xxxx.onrender.com https://brewlite-xxxx.vercel.app fb388bd
set -u

API_URL="${1:?Thiếu địa chỉ API}"
WEB_URL="${2:?Thiếu địa chỉ web}"
VERSION="${3:?Thiếu mã commit}"
WAIT_SECONDS="${WAIT_SECONDS:-600}"

deadline=$((SECONDS + WAIT_SECONDS))
attempt=0
while true; do
  attempt=$((attempt + 1))
  body=$(curl -sS --max-time 30 "$API_URL/health" 2>&1)
  if [[ "$body" == *'"status":"ok"'* && "$body" == *"\"version\":\"$VERSION\""* ]]; then
    echo "SMK-01 đạt (lần $attempt): $body"
    break
  fi
  if ((SECONDS >= deadline)); then
    echo "SMK-01 lỗi: quá $WAIT_SECONDS giây, API chưa chạy bản $VERSION. Lần cuối nhận: $body"
    exit 1
  fi
  echo "Lần $attempt: chưa đúng bản $VERSION ($body). Chờ 15 giây..."
  sleep 15
done

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 60 "$WEB_URL/")
if [[ "$code" != "200" ]]; then
  echo "SMK-02 lỗi: trang chủ web trả mã $code, không phải 200"
  exit 1
fi
echo "SMK-02 đạt: $WEB_URL trả 200"