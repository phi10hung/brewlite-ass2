import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth.types.js';

// Chỉ cho tài khoản Nhân viên đi tiếp (FR-09 tiêu chí 6, NFR-05, BR-10).
// Luôn dùng SAU JwtAuthGuard để đã có req.user:
// @UseGuards(JwtAuthGuard, StaffGuard)
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (req.user?.role !== Role.STAFF) {
      throw new ForbiddenException('Chỉ nhân viên được truy cập');
    }
    return true;
  }
}
