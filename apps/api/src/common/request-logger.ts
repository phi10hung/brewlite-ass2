import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

// Ghi một dòng log cho mỗi yêu cầu khi đã trả phản hồi (ADR 006, NFR-20).
// Chỉ ghi phương thức, đường dẫn (không kèm query string), mã trạng thái và thời gian xử lý.
// Không ghi body, header nên log không chứa mật khẩu, token.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  res.on('finish', () => {
    const entry = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
    };
    if (res.statusCode >= 500) {
      logger.error(entry);
    } else {
      logger.log(entry);
    }
  });
  next();
}
