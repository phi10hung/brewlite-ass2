# Đóng gói API NestJS + Prisma thành Docker image (ADR 008)

# ----- Giai đoạn 1: cài thư viện và build -----
FROM node:24-slim AS build
# Prisma cần openssl để kết nối PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# prisma.config.ts đọc DATABASE_URL khi chạy "prisma generate" lúc cài thư viện.
# Lúc build chỉ cần một địa chỉ giả; địa chỉ thật được truyền vào khi chạy container.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
# Đổi xuống dòng của script sang kiểu Linux (LF), phòng khi tệp được lưu trên Windows (CRLF)
RUN sed -i 's/\r$//' docker-start.sh
RUN npm run build && npm prune --omit=dev

# ----- Giai đoạn 2: image chạy, chỉ giữ thứ cần thiết -----
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

# Mã commit, pipeline CD truyền vào lúc build; /health trả giá trị này (ADR 006)
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

COPY --from=build /app/package.json /app/prisma.config.ts /app/docker-start.sh ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["sh", "./docker-start.sh"]
