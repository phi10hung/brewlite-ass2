import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type User = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'STAFF';
  loyaltyPoints: number;
  createdAt: Date;
};

// Bảng User giả trong bộ nhớ: đăng ký xong thì đăng nhập được, giống database thật
let users: User[] = [];
const prisma = {
  user: {
    findUnique: vi.fn(({ where }: { where: { id?: number; email?: string } }) =>
      Promise.resolve(
        users.find((u) =>
          where.id !== undefined ? u.id === where.id : u.email === where.email,
        ) ?? null,
      ),
    ),
    create: vi.fn(({ data }: { data: Partial<User> }) => {
      const user = {
        id: users.length + 1,
        role: 'CUSTOMER' as const,
        loyaltyPoints: 0,
        createdAt: new Date(),
        ...data,
      } as User;
      users.push(user);
      return Promise.resolve(user);
    }),
  },
};

const BAN_MOI = {
  name: 'Bạn Mới',
  email: 'BanMoi@Gmail.com',
  password: '123456',
};

describe('POST /auth/register, POST /auth/login, GET /auth/me (API-T11 – API-T18)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    // Cùng cấu hình kiểm tra dữ liệu như src/main.ts (BR-02, NFR-06)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    users = [];
    vi.clearAllMocks();
  });

  const http = () => request(app.getHttpServer());

  it('API-T11: đăng ký trả 201 kèm token, tài khoản CUSTOMER, không có mật khẩu', async () => {
    const res = await http().post('/auth/register').send(BAN_MOI);

    expect(res.status).toBe(201);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toEqual({
      id: 1,
      name: 'Bạn Mới',
      email: 'banmoi@gmail.com',
      role: 'CUSTOMER',
      loyaltyPoints: 0,
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(users[0].passwordHash).not.toBe('123456');
  });

  it('API-T12: dữ liệu sai trả 400 kèm câu lỗi tiếng Việt', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ name: '', email: 'khong-phai-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Vui lòng nhập họ tên',
        'Email không hợp lệ',
        'Mật khẩu tối thiểu 6 ký tự',
      ]),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('API-T13: gửi kèm trường không khai báo (role) thì 400, không tạo được tài khoản nhân viên', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ ...BAN_MOI, role: 'STAFF' });

    expect(res.status).toBe(400);
    expect(users).toHaveLength(0);
  });

  it('API-T14: email đã đăng ký (khác chữ hoa, thường) thì 409', async () => {
    await http().post('/auth/register').send(BAN_MOI);
    const res = await http()
      .post('/auth/register')
      .send({ ...BAN_MOI, email: 'BANMOI@gmail.com' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email đã được đăng ký');
  });

  it('API-T15: đăng nhập đúng trả 200 kèm token', async () => {
    await http().post('/auth/register').send(BAN_MOI);
    const res = await http()
      .post('/auth/login')
      .send({ email: 'banmoi@gmail.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user.email).toBe('banmoi@gmail.com');
  });

  it('API-T16: sai mật khẩu hoặc sai email đều 401 cùng một câu', async () => {
    await http().post('/auth/register').send(BAN_MOI);
    const saiMatKhau = await http()
      .post('/auth/login')
      .send({ email: 'banmoi@gmail.com', password: 'sai-mat-khau' });
    const saiEmail = await http()
      .post('/auth/login')
      .send({ email: 'khong-co@gmail.com', password: '123456' });

    for (const res of [saiMatKhau, saiEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Email hoặc mật khẩu không đúng');
    }
  });

  it('API-T17: GET /auth/me thiếu token hoặc token sai thì 401', async () => {
    const thieu = await http().get('/auth/me');
    const sai = await http()
      .get('/auth/me')
      .set('Authorization', 'Bearer token-khong-hop-le');

    expect(thieu.status).toBe(401);
    expect(thieu.body.message).toBe('Vui lòng đăng nhập');
    expect(sai.status).toBe(401);
    expect(sai.body.message).toBe('Phiên đăng nhập đã hết hạn');
  });

  it('API-T18: GET /auth/me có token trả tài khoản kèm điểm thưởng, không có mật khẩu', async () => {
    const login = await http().post('/auth/register').send(BAN_MOI);
    users[0].loyaltyPoints = 7;

    const res = await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 1,
      name: 'Bạn Mới',
      email: 'banmoi@gmail.com',
      role: 'CUSTOMER',
      loyaltyPoints: 7,
    });
  });
});
