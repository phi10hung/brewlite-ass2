import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const prisma = {
  user: { findUnique: vi.fn(), create: vi.fn() },
};
const jwt = { signAsync: vi.fn() };

const KHACH = {
  id: 1,
  email: 'khach@brewlite.vn',
  name: 'Khách hàng mẫu',
  role: 'CUSTOMER' as const,
  loyaltyPoints: 12,
  passwordHash: '',
  createdAt: new Date('2026-11-01T00:00:00Z'),
};

describe('AuthService (UT-25 – UT-30)', () => {
  let service: AuthService;

  beforeAll(async () => {
    KHACH.passwordHash = await bcrypt.hash('123456', 10);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    jwt.signAsync.mockResolvedValue('token-gia');
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('UT-25: đăng ký lưu email chữ thường, mật khẩu đã băm, không trả passwordHash', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...KHACH, ...data, id: 3, loyaltyPoints: 0 }),
    );

    const result = await service.register({
      name: ' Bạn Mới ',
      email: 'BanMoi@Gmail.com',
      password: '123456',
    });

    const saved = prisma.user.create.mock.calls[0][0].data;
    expect(saved.email).toBe('banmoi@gmail.com');
    expect(saved.name).toBe('Bạn Mới');
    expect(saved.passwordHash).not.toBe('123456');
    expect(await bcrypt.compare('123456', saved.passwordHash)).toBe(true);
    expect(saved).not.toHaveProperty('role');
    expect(result.accessToken).toBe('token-gia');
    expect(result.user).toEqual({
      id: 3,
      name: 'Bạn Mới',
      email: 'banmoi@gmail.com',
      role: 'CUSTOMER',
      loyaltyPoints: 0,
    });
  });

  it('UT-26: đăng ký trùng email (khác chữ hoa, thường) thì báo 409, không tạo tài khoản', async () => {
    prisma.user.findUnique.mockResolvedValue(KHACH);

    await expect(
      service.register({
        name: 'A',
        email: 'KHACH@brewlite.vn',
        password: '123456',
      }),
    ).rejects.toThrow(new ConflictException('Email đã được đăng ký'));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'khach@brewlite.vn' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('UT-27: đăng nhập đúng thì ký JWT gồm mã, email, vai trò', async () => {
    prisma.user.findUnique.mockResolvedValue(KHACH);

    const result = await service.login({
      email: 'khach@brewlite.vn',
      password: '123456',
    });

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'khach@brewlite.vn',
      role: 'CUSTOMER',
    });
    expect(result.accessToken).toBe('token-gia');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('UT-28: sai mật khẩu thì báo 401 "Email hoặc mật khẩu không đúng"', async () => {
    prisma.user.findUnique.mockResolvedValue(KHACH);

    await expect(
      service.login({ email: 'khach@brewlite.vn', password: 'sai-mat-khau' }),
    ).rejects.toThrow(
      new UnauthorizedException('Email hoặc mật khẩu không đúng'),
    );
  });

  it('UT-29: email chưa đăng ký cũng báo đúng câu đó, không lộ email nào đã có', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'khong-co@brewlite.vn', password: '123456' }),
    ).rejects.toThrow(
      new UnauthorizedException('Email hoặc mật khẩu không đúng'),
    );
  });

  it('UT-30: xem tài khoản trả điểm thưởng, không có passwordHash', async () => {
    prisma.user.findUnique.mockResolvedValue(KHACH);

    const user = await service.me(1);

    expect(user).toEqual({
      id: 1,
      name: 'Khách hàng mẫu',
      email: 'khach@brewlite.vn',
      role: 'CUSTOMER',
      loyaltyPoints: 12,
    });
  });
});
