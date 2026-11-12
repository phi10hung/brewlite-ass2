import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.types.js';

// Lấy người đang đăng nhập trong controller (dùng sau JwtAuthGuard):
// me(@CurrentUser() user: AuthUser) → user.userId, user.role
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const req = context.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);
