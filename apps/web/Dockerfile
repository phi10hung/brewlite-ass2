# Đóng gói web Next.js thành Docker image để chạy cùng API, database bằng Docker Compose (NFR-16, ADR 008)
# Production dùng Vercel, không dùng image này.

# ----- Giai đoạn 1: cài thư viện và build -----
FROM node:24-slim AS build
WORKDIR /app

# Địa chỉ API được ghi vào bản build (biến NEXT_PUBLIC_), nên phải có lúc build.
# Trình duyệt gọi API qua cổng 4000 của máy, nên giữ localhost.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ----- Giai đoạn 2: image chạy, chỉ giữ thứ cần thiết -----
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
