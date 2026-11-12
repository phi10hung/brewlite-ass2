import { AsyncLocalStorage } from 'node:async_hooks';

// Database giả trong bộ nhớ cho test đơn hàng (không cần PostgreSQL).
// Chỉ hiện thực những truy vấn OrdersService, StaffOrdersService dùng.
// Transaction có hoàn tác: callback ném lỗi thì mọi thay đổi trong lần đó bị trả lại,
// giống ROLLBACK của database thật.

export const CA_PHE = 1;
export const SUA = 2;
export const KEM = 3;

export const PRODUCTS = [
  { id: 1, name: 'Latte', price: 45000 },
  { id: 2, name: 'Bạc xỉu', price: 32000 },
];
export const TOPPINGS = [{ id: 7, name: 'Kem cheese', price: 12000 }];
// Công thức tính cho size M
export const RECIPES = [
  { productId: 1, ingredientId: CA_PHE, amount: 18 },
  { productId: 1, ingredientId: SUA, amount: 200 },
  { productId: 2, ingredientId: CA_PHE, amount: 10 },
  { productId: 2, ingredientId: SUA, amount: 100 },
];
export const TOPPING_RECIPES = [
  { toppingId: 7, ingredientId: KEM, amount: 30 },
];

type Ingredient = { stock: number; version: number };
export type FakeOrder = {
  id: number;
  userId: number;
  code: string;
  status: string;
  total: number;
  expiresAt: Date;
  data: Record<string, any>;
  ingredients: { ingredientId: number; amount: number }[];
};

type InArg = { in: number[] } | undefined;
const pick = <T extends { id: number }>(rows: T[], arg: InArg) =>
  arg ? rows.filter((r) => arg.in.includes(r.id)) : rows;
// Nhường lượt cho yêu cầu khác, để mô phỏng nhiều đơn chạy xen kẽ
const yieldTurn = () => new Promise((resolve) => setImmediate(resolve));

export function createFakeOrderDb(
  stock: Record<number, number> = { [CA_PHE]: 1000, [SUA]: 5000, [KEM]: 1000 },
) {
  const ingredients = new Map<number, Ingredient>(
    Object.entries(stock).map(([id, value]) => [
      Number(id),
      { stock: value, version: 0 },
    ]),
  );
  const orders: FakeOrder[] = [];

  const view = (o: FakeOrder) => ({
    ...o.data,
    id: o.id,
    code: o.code,
    status: o.status,
    total: o.total,
    expiresAt: o.expiresAt,
    createdAt: o.data.createdAt,
    promotion: null,
    payments: [],
    items: o.data.items?.create ?? [],
    user: { name: `Khách ${o.userId}` },
    ingredients: o.ingredients,
  });

  // Mỗi transaction có danh sách hoàn tác riêng, kể cả khi nhiều transaction chạy xen kẽ
  const current = new AsyncLocalStorage<(() => void)[]>();
  const remember = (fn: () => void) => current.getStore()?.push(fn);

  const db: any = {
    product: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(pick(PRODUCTS, where?.id)),
      ),
    },
    topping: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(pick(TOPPINGS, where?.id)),
      ),
    },
    recipe: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          RECIPES.filter(
            (r) => !where || where.productId.in.includes(r.productId),
          ),
        ),
      ),
    },
    toppingRecipe: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          TOPPING_RECIPES.filter(
            (r) => !where || where.toppingId.in.includes(r.toppingId),
          ),
        ),
      ),
    },
    ingredient: {
      findMany: vi.fn(async ({ where }) => {
        await yieldTurn();
        return [...ingredients]
          .filter(([id]) => !where || where.id.in.includes(id))
          .map(([id, ing]) => ({ id, ...ing }));
      }),
      // Chỉ ghi được khi version còn đúng (optimistic locking)
      updateMany: vi.fn(async ({ where, data }) => {
        await yieldTurn();
        const ing = ingredients.get(where.id);
        if (!ing || ing.version !== where.version) return { count: 0 };
        const before = { ...ing };
        ing.stock += data.stock.increment;
        ing.version += data.version.increment;
        remember(() => Object.assign(ing, before));
        return { count: 1 };
      }),
      update: vi.fn(({ where, data }) => {
        const ing = ingredients.get(where.id)!;
        const before = { ...ing };
        ing.stock += data.stock.increment;
        ing.version += data.version.increment;
        remember(() => Object.assign(ing, before));
        return Promise.resolve({ id: where.id, ...ing });
      }),
    },
    order: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          orders
            .filter(
              (o) =>
                (where?.userId === undefined || o.userId === where.userId) &&
                (!where?.status?.in || where.status.in.includes(o.status)),
            )
            .map(view),
        ),
      ),
      findFirst: vi.fn(({ where }) => {
        const o = orders.find(
          (x) =>
            x.id === where.id &&
            (where.userId === undefined || x.userId === where.userId),
        );
        return Promise.resolve(o ? view(o) : null);
      }),
      findUnique: vi.fn(({ where }) => {
        const o = orders.find((x) => x.id === where.id);
        return Promise.resolve(o ? view(o) : null);
      }),
      findUniqueOrThrow: vi.fn(({ where }) =>
        Promise.resolve(view(orders.find((x) => x.id === where.id)!)),
      ),
      // Chỉ đổi khi trạng thái vẫn như lúc đọc
      updateMany: vi.fn(({ where, data }) => {
        const o = orders.find(
          (x) => x.id === where.id && x.status === where.status,
        );
        if (!o) return Promise.resolve({ count: 0 });
        const before = o.status;
        o.status = data.status;
        remember(() => (o.status = before));
        return Promise.resolve({ count: 1 });
      }),
      create: vi.fn(({ data }) => {
        const order: FakeOrder = {
          id: orders.length + 1,
          userId: data.userId,
          code: data.code,
          status: data.status,
          total: data.total,
          expiresAt: data.expiresAt,
          data: { ...data, createdAt: new Date() },
          ingredients: data.ingredients.create,
        };
        orders.push(order);
        remember(() => orders.splice(orders.indexOf(order), 1));
        return Promise.resolve({
          id: order.id,
          code: order.code,
          total: order.total,
          expiresAt: order.expiresAt,
        });
      }),
    },
    orderIngredient: {
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          orders.find((o) => o.id === where.orderId)?.ingredients ?? [],
        ),
      ),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const log: (() => void)[] = [];
      try {
        return await current.run(log, () => callback(db));
      } catch (error) {
        for (const fn of log.reverse()) fn();
        throw error;
      }
    }),
  };

  // Thêm sẵn một đơn (ví dụ đơn chờ cũ, đơn đã PAID)
  const addOrder = (
    userId: number,
    status: string,
    used: { ingredientId: number; amount: number }[] = [],
  ) => {
    const order: FakeOrder = {
      id: orders.length + 1,
      userId,
      code: `BL-CU${orders.length + 1}`,
      status,
      total: 45000,
      expiresAt: new Date(Date.now() + 60_000),
      data: { createdAt: new Date() },
      ingredients: used,
    };
    orders.push(order);
    return order;
  };

  return { db, ingredients, orders, addOrder };
}
