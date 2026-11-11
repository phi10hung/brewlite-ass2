import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from './auth.types.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { StaffGuard } from './staff.guard.js';

const jwt = new JwtService({
  secret: 'khoa-test',
  signOptions: { expiresIn: '1d' },
});

type FakeRequest = {
  headers: { authorization?: string };
  user?: AuthUser;
};

// Giả lập ExecutionContext của NestJS chỉ với phần request mà guard cần
function contextOf(req: FakeRequest) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard, StaffGuard (UT-31 – UT-35)', () => {
  const guard = new JwtAuthGuard(jwt);

  it('UT-31: thiếu token thì 401 "Vui lòng đăng nhập"', async () => {
    await expect(guard.canActivate(contextOf({ headers: {} }))).rejects.toThrow(
      new UnauthorizedException('Vui lòng đăng nhập'),
    );
  });

  it('UT-32: token sai chữ ký thì 401 "Phiên đăng nhập đã hết hạn"', async () => {
    const other = new JwtService({ secret: 'khoa-khac' });
    const token = await other.signAsync({
      sub: 1,
      email: 'a@b.vn',
      role: 'CUSTOMER',
    });

    await expect(
      guard.canActivate(
        contextOf({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(new UnauthorizedException('Phiên đăng nhập đã hết hạn'));
  });

  it('UT-33: token hết hạn thì 401 (NFR-04)', async () => {
    const token = await jwt.signAsync(
      { sub: 1, email: 'a@b.vn', role: 'CUSTOMER' },
      { expiresIn: -10 },
    );

    await expect(
      guard.canActivate(
        contextOf({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(new UnauthorizedException('Phiên đăng nhập đã hết hạn'));
  });

  it('UT-34: token đúng thì cho qua và gắn người dùng vào request', async () => {
    const token = await jwt.signAsync({
      sub: 7,
      email: 'staff@brewlite.vn',
      role: 'STAFF',
    });
    const req: FakeRequest = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextOf(req))).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: 7,
      email: 'staff@brewlite.vn',
      role: 'STAFF',
    });
  });

  it('UT-35: StaffGuard chặn Khách hàng 403, cho Nhân viên đi tiếp', () => {
    const staffGuard = new StaffGuard();
    const khach = {
      userId: 1,
      email: 'khach@brewlite.vn',
      role: 'CUSTOMER' as const,
    };
    const staff = {
      userId: 2,
      email: 'staff@brewlite.vn',
      role: 'STAFF' as const,
    };

    expect(() =>
      staffGuard.canActivate(contextOf({ headers: {}, user: khach })),
    ).toThrow(new ForbiddenException('Chỉ nhân viên được truy cập'));
    expect(
      staffGuard.canActivate(contextOf({ headers: {}, user: staff })),
    ).toBe(true);
  });
});
