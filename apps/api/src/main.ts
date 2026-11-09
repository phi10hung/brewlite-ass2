import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { requestLogger } from './common/request-logger.js';

async function bootstrap() {
  // Log in ra stdout dạng JSON một dòng (ADR 006)
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  const config = app.get(ConfigService);

  app.use(requestLogger);
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
  });
  // Kiểm tra dữ liệu gửi lên theo DTO; trường không khai báo bị từ chối với mã 400 (BR-02, NFR-06)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(config.get<number>('PORT') ?? 4000);
}
await bootstrap();
