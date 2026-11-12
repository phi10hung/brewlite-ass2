import {
  createCustomers,
  createTestApi,
  productId,
  resetDatabase,
  SEED_STOCK,
  stocks,
  type TestApi,
} from './helpers.js';

describe('Đặt đơn đồng thời không bán vượt kho (INT-T04)', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await createTestApi();
  });

  afterAll(async () => {
    await api.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(api.prisma);
  });

  it('INT-T04: 20 khách đặt cùng lúc khi nguyên liệu chỉ đủ 3 ly: đúng 3 đơn được tạo, 17 yêu cầu bị từ chối 400 hoặc 409, tồn kho không âm và khớp lượng đã trừ (NFR-02, BR-04, ADR 004)', async () => {
    // Nước ép cam size S cần 3 × 0,8 = 2,4 → 3 quả cam mỗi ly. Còn 10 quả: đủ 3 ly, không đủ 4
    await api.prisma.ingredient.update({
      where: { name: 'Cam tươi' },
      data: { stock: 10 },
    });
    const nuocCam = await productId(api, 'Nước ép cam');
    // 20 khách khác nhau: mỗi khách chỉ giữ một đơn chờ (BR-06) nên không dùng chung một tài khoản
    const tokens = await createCustomers(api, 20);

    // Gửi cả 20 yêu cầu cùng lúc, không chờ yêu cầu trước xong
    const results = await Promise.all(
      tokens.map((token) =>
        api
          .http()
          .post('/orders')
          .set('Authorization', `Bearer ${token}`)
          .send({
            items: [
              { productId: nuocCam, size: 'S', toppingIds: [], quantity: 1 },
            ],
            paymentMethod: 'WALLET',
          }),
      ),
    );

    const codes = results.map((res) => res.status);
    expect(codes.filter((code) => code === 201)).toHaveLength(3);
    // 17 yêu cầu còn lại: 400 (không đủ nguyên liệu) hoặc 409 (hệ thống bận), không lỗi 500
    expect(codes.filter((code) => code === 400 || code === 409)).toHaveLength(
      17,
    );
    expect(await api.prisma.order.count()).toBe(3);

    // Tồn kho mọi nguyên liệu = ban đầu − tổng lượng các đơn đã tạo đã trừ, và không âm
    const usedRows = await api.prisma.orderIngredient.findMany({
      include: { ingredient: true },
    });
    const used: Record<string, number> = {};
    for (const row of usedRows) {
      used[row.ingredient.name] = (used[row.ingredient.name] ?? 0) + row.amount;
    }
    const initial = { ...SEED_STOCK, 'Cam tươi': 10 };
    const after = await stocks(api.prisma);
    for (const [name, stock] of Object.entries(initial)) {
      expect(after[name], name).toBe(stock - (used[name] ?? 0));
      expect(after[name], name).toBeGreaterThanOrEqual(0);
    }
    expect(after['Cam tươi']).toBe(1);
  });
});
