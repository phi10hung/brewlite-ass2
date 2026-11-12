import type { Role } from '../generated/prisma/enums.js';

// Nội dung được ký vào JWT (FR-09). Không chứa mật khẩu hay thông tin nhạy cảm.
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

// Người dùng gắn vào request sau khi JwtAuthGuard kiểm tra token.
// Trong controller lấy ra bằng: @CurrentUser() user: AuthUser → user.userId
export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
}
