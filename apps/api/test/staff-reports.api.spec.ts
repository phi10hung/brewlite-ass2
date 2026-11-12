import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const prisma = {
  payment: { findMany: vi.fn() },
  recipe: { findMany: vi.fn() },
  toppingRecipe: { findMany: vi.fn() },
  ingredient: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

describe('API doanh thu, kho, nhập kho (API-T31 – API-T32)', () => {
  let app: INestApplication;
  let khach: string;
  let nhanVien: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    // Cùng cấu hình kiểm tra dữ liệu như src/main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const jwt = app.get(JwtService);
    khach = jwt.sign({ sub: 7, email: 'khach@brewlite.vn', role: 'CUSTOMER' });
    nhanVien = jwt.sign({ sub: 8, email: 'staff@brewlite.vn', role: 'STAFF' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.recipe.findMany.mockResolvedValue([{ ingredientId: 1, amount: 18 }]);
    prisma.toppingRecipe.findMany.mockResolvedValue([]);
    prisma.ingredient.findMany.mockResolvedValue([
      { id: 1, name: 'Cà phê xay', unit: 'g', stock: 100 },
    ]);
    prisma.ingredient.findUnique.mockResolvedValue({ id: 1 });
    prisma.ingredient.update.mockResolvedValue({
      id: 1,
      name: 'Cà phê xay',
      unit: 'g',
      stock: 600,
    });
  });

  const http = () => request(app.getHttpServer());

  it('API-T31: khách gọi doanh thu, kho trả 403; nhân viên xem được', async () => {
    for (const path of ['/staff/revenue', '/staff/ingredients']) {
      const res = await http()
        .get(path)
        .set('Authorization', `Bearer ${khach}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Chỉ nhân viên được truy cập');
    }

    const revenue = await http()
      .get('/staff/revenue')
      .set('Authorization', `Bearer ${nhanVien}`);
    expect(revenue.status).toBe(200);
    expect(revenue.body).toEqual({
      total: 0,
      count: 0,
      todayTotal: 0,
      todayCount: 0,
      transactions: [],
    });

    const ingredients = await http()
      .get('/staff/ingredients')
      .set('Authorization', `Bearer ${nhanVien}`);
    expect(ingredients.body).toEqual([
      { id: 1, name: 'Cà phê xay', unit: 'g', stock: 100, lowStock: true },
    ]);
  });

  it('API-T32: nhập kho: số lượng không hợp lệ hoặc mã sai trả 400; hợp lệ trả 200 kèm tồn kho mới', async () => {
    const send = (id: string, body: object) =>
      http()
        .post(`/staff/ingredients/${id}/restock`)
        .set('Authorization', `Bearer ${nhanVien}`)
        .send(body);

    expect((await send('1', { amount: 0 })).body.message).toEqual([
      'Số lượng nhập phải lớn hơn 0',
    ]);
    expect((await send('1', { amount: 'nhiều' })).status).toBe(400);
    expect((await send('abc', { amount: 5 })).body.message).toBe(
      'Mã nguyên liệu không hợp lệ',
    );
    expect(prisma.ingredient.update).not.toHaveBeenCalled();

    const ok = await send('1', { amount: 500 });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({
      id: 1,
      name: 'Cà phê xay',
      unit: 'g',
      stock: 600,
      lowStock: false,
    });
  });
});
