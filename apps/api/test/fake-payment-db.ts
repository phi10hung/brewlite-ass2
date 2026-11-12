import { AsyncLocalStorage } from 'node:async_hooks';

// Database giả trong bộ nhớ cho test thanh toán: bảng User, Order, Payment, LoyaltyTransaction.
// Giữ đúng các ràng buộc unique của schema (Payment.idempotencyKey, Payment.txnRef,
// LoyaltyTransaction [orderId, type]) và hoàn tác khi transaction lỗi, giống database thật.

type Row = Record<string, any>;
type Where = Record<string, any>;

// So khớp điều kiện where đơn giản: bằng nhau hoặc { in: [...] }
function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'orderId_type') {
      return row.orderId === cond.orderId && row.type === cond.type;
    }
    if (cond && typeof cond === 'object' && 'in' in cond) {
      return (cond.in as unknown[]).includes(row[key]);
    }
    return row[key] === cond;
  });
}

const uniqueError = () =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const yieldTurn = () => new Promise((resolve) => setImmediate(resolve));

export function createFakePaymentDb() {
  const tables: Record<string, Row[]> = {
    user: [{ id: 7, name: 'Khách', loyaltyPoints: 0 }],
    order: [],
    payment: [],
    loyaltyTransaction: [],
  };
  const unique: Record<string, ((r: Row) => string)[]> = {
    payment: [(r) => `key:${r.idempotencyKey}`, (r) => `txn:${r.txnRef}`],
    loyaltyTransaction: [(r) => `${r.orderId}:${r.type}`],
  };
  const current = new AsyncLocalStorage<(() => void)[]>();
  const remember = (fn: () => void) => current.getStore()?.push(fn);

  // Cập nhật một dòng, hỗ trợ { increment } và { decrement }
  const change = (row: Row, data: Row) => {
    const before = { ...row };
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'increment' in value) {
        row[key] += value.increment;
      } else if (value && typeof value === 'object' && 'decrement' in value) {
        row[key] -= value.decrement;
      } else {
        row[key] = value;
      }
    }
    remember(() => Object.assign(row, before));
  };

  const delegate = (name: string) => {
    const rows = tables[name];
    const find = (where: Where) => rows.find((r) => matches(r, where)) ?? null;
    return {
      findUnique: vi.fn(({ where }) => Promise.resolve(find(where))),
      findFirst: vi.fn(({ where, orderBy }) => {
        const list = rows.filter((r) => matches(r, where));
        if (orderBy?.createdAt === 'desc') list.reverse();
        return Promise.resolve(list[0] ?? null);
      }),
      findUniqueOrThrow: vi.fn(({ where }) => {
        const row = find(where);
        return row
          ? Promise.resolve(row)
          : Promise.reject(new Error('Không có'));
      }),
      findMany: vi.fn(({ where } = {}) =>
        Promise.resolve(rows.filter((r) => matches(r, where))),
      ),
      count: vi.fn(({ where }) =>
        Promise.resolve(rows.filter((r) => matches(r, where)).length),
      ),
      create: vi.fn(async ({ data }) => {
        await yieldTurn();
        const keys = (unique[name] ?? []).map((k) => k(data));
        if (
          rows.some((r) =>
            (unique[name] ?? []).some((k, i) => k(r) === keys[i]),
          )
        ) {
          throw uniqueError();
        }
        const row = {
          id: rows.length + 1,
          status: 'PENDING',
          refundStatus: null,
          ...data,
        };
        rows.push(row);
        remember(() => rows.splice(rows.indexOf(row), 1));
        return row;
      }),
      update: vi.fn(({ where, data }) => {
        const row = find(where)!;
        change(row, data);
        return Promise.resolve(row);
      }),
      updateMany: vi.fn(({ where, data }) => {
        const list = rows.filter((r) => matches(r, where));
        list.forEach((row) => change(row, data));
        return Promise.resolve({ count: list.length });
      }),
    };
  };

  const db: any = {
    user: delegate('user'),
    order: delegate('order'),
    payment: delegate('payment'),
    loyaltyTransaction: delegate('loyaltyTransaction'),
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

  // Thêm sẵn một đơn của khách 7, tổng 125.000đ, còn hạn 5 phút
  const addOrder = (fields: Row = {}) => {
    const order = {
      id: tables.order.length + 1,
      code: `BL-THU00${tables.order.length + 1}`,
      userId: 7,
      status: 'PENDING',
      total: 125000,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      ...fields,
    };
    tables.order.push(order);
    return order;
  };

  return { db, tables, addOrder, user: tables.user[0] };
}
