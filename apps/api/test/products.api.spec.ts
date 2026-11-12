import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const CA_PHE = 1;
const SUA = 2;
const KEM = 3;
const TRAN_CHAU = 4;

const LATTE = {
  id: 1,
  name: 'Latte',
  description: 'Espresso hòa cùng nhiều sữa tươi.',
  category: 'Cà phê',
  price: 45000,
  imageUrl: '/images/products/latte.jpg',
};
const CAPPUCCINO = { ...LATTE, id: 2, name: 'Cappuccino' };

const RECIPES = [
  { productId: 1, ingredientId: CA_PHE, amount: 18 },
  { productId: 1, ingredientId: SUA, amount: 200 },
  { productId: 2, ingredientId: CA_PHE, amount: 18 },
  { productId: 2, ingredientId: SUA, amount: 150 },
];
const TOPPING_RECIPES = [
  { toppingId: 3, ingredientId: KEM, amount: 30 },
  { toppingId: 4, ingredientId: TRAN_CHAU, amount: 50 },
];
const TOPPINGS = [
  { id: 3, name: 'Kem cheese', price: 12000 },
  { id: 4, name: 'Trân châu đen', price: 8000 },
];

const prisma = {
  product: { findMany: vi.fn(), findUnique: vi.fn() },
  topping: { findMany: vi.fn() },
  recipe: { findMany: vi.fn() },
  toppingRecipe: { findMany: vi.fn() },
  ingredient: { findMany: vi.fn() },
};

function setStock(change: Record<number, number> = {}) {
  const stock = {
    [CA_PHE]: 1000,
    [SUA]: 5000,
    [KEM]: 1000,
    [TRAN_CHAU]: 1000,
    ...change,
  };
  prisma.ingredient.findMany.mockResolvedValue(
    Object.entries(stock).map(([id, value]) => ({
      id: Number(id),
      stock: value,
    })),
  );
}

describe('GET /products, GET /products/:id (API-T01 – API-T09)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setStock();
    prisma.product.findMany.mockResolvedValue([LATTE, CAPPUCCINO]);
    prisma.product.findUnique.mockResolvedValue(LATTE);
    prisma.topping.findMany.mockResolvedValue(TOPPINGS);
    prisma.recipe.findMany.mockImplementation(
      (args?: { where?: { productId?: number } }) =>
        Promise.resolve(
          RECIPES.filter(
            (recipe) =>
              args?.where?.productId === undefined ||
              recipe.productId === args.where.productId,
          ),
        ),
    );
    prisma.toppingRecipe.findMany.mockResolvedValue(TOPPING_RECIPES);
  });

  it('API-T01: GET /products trả 200 kèm thông tin của từng món', async () => {
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: 'Latte',
      category: 'Cà phê',
      price: 45000,
      imageUrl: '/images/products/latte.jpg',
    });
  });

  it('API-T02: lọc theo danh mục khi có ?category=', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .query({ category: 'Cà phê' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'Cà phê' } }),
    );
  });

  it('API-T03: stock là số ly size S, không topping còn pha được', async () => {
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.body[0].stock).toBe(31);
  });

  it('API-T04: hết nguyên liệu thì stock = 0', async () => {
    setStock({ [SUA]: 100 });
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.body[0].stock).toBe(0);
    expect(res.body[1].stock).toBe(0);
  });

  it('API-T05: món dùng chung nguyên liệu cùng giảm số ly khi kho giảm', async () => {
    setStock({ [CA_PHE]: 150 });
    const res = await request(app.getHttpServer()).get('/products');
    expect(res.body[0].stock).toBe(10);
    expect(res.body[1].stock).toBe(10);
  });

  it('API-T06: chi tiết món có size S/M/L, topping và số ly còn pha được', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: 'Latte', stock: 31 });
    expect(res.body.sizes).toEqual([
      { size: 'S', extra: 0 },
      { size: 'M', extra: 5000 },
      { size: 'L', extra: 10000 },
    ]);
    expect(res.body.toppings).toHaveLength(2);
  });

  it('API-T07: topping không đủ nguyên liệu thì available = false', async () => {
    setStock({ [KEM]: 10 });
    const res = await request(app.getHttpServer()).get('/products/1');
    const kem = res.body.toppings.find((t: { id: number }) => t.id === 3);
    const tranChau = res.body.toppings.find((t: { id: number }) => t.id === 4);
    expect(kem.available).toBe(false);
    expect(tranChau.available).toBe(true);
  });

  it('API-T08: id không tồn tại trả 404 "Không tìm thấy món"', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer()).get('/products/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Không tìm thấy món');
  });

  it('API-T09: id không phải số trả 400 "Mã món không hợp lệ"', async () => {
    const res = await request(app.getHttpServer()).get('/products/abc');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Mã món không hợp lệ');
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });
});
