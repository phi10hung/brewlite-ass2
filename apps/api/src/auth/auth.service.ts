import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

// Số vòng băm bcrypt, giống seed (tài khoản mẫu cũng băm 10 vòng)
const SALT_ROUNDS = 10;

type UserRecord = {
  id: number;
  email: string;
  name: string;
  role: Role;
  loyaltyPoints: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // FR-08: đăng ký tài khoản Khách hàng
  async register(dto: RegisterDto) {
    // Lưu email chữ thường để "A@x.vn" và "a@x.vn" là cùng một tài khoản
    const email = dto.email.trim().toLowerCase();
    const existed = await this.prisma.user.findUnique({ where: { email } });
    if (existed) {
      throw new ConflictException('Email đã được đăng ký');
    }
    // Chỉ lưu bản băm, không lưu mật khẩu gốc (NFR-04)
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // Không nhận role từ web: tài khoản mới luôn là CUSTOMER (giá trị mặc định trong schema)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name.trim() },
    });
    return this.buildResponse(user);
  }

  // FR-09: đăng nhập
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    // Sai email hay sai mật khẩu đều báo cùng một câu, để không lộ email nào đã đăng ký
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.buildResponse(user);
  }

  // FR-09: thông tin người đang đăng nhập, kèm điểm thưởng mới nhất trong database
  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    return this.publicUser(user);
  }

  private async buildResponse(user: UserRecord) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: this.publicUser(user),
    };
  }

  // Chỉ trả các trường được phép; không bao giờ trả passwordHash (NFR-04)
  private publicUser(user: UserRecord) {
    const { id, name, email, role, loyaltyPoints } = user;
    return { id, name, email, role, loyaltyPoints };
  }
}
