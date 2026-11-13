import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RevenueView from "./RevenueView";

// Giống API GET /staff/revenue trả về
const REVENUE = {
  total: 182000,
  count: 3,
  todayTotal: 57000,
  todayCount: 1,
  transactions: [
    {
      id: 9,
      orderId: 7,
      method: "CARD",
      amount: 57000,
      transactionNo: "15735108",
      createdAt: "2026-11-13T03:05:00.000Z",
      orderCode: "BL-AB12CD",
      customerName: "Khách hàng mẫu",
    },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...results: Response[]) {
  const fetchMock = vi.fn();
  for (const result of results) fetchMock.mockResolvedValueOnce(result);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn hình doanh thu (CT-61 – CT-62)", () => {
  it("CT-61: gọi GET /staff/revenue, hiện doanh thu hôm nay, tổng cộng và từng giao dịch; chưa có giao dịch thì báo trống", async () => {
    const fetchMock = mockFetch(
      jsonResponse(REVENUE),
      jsonResponse({ ...REVENUE, transactions: [] }),
    );
    const { unmount } = render(<RevenueView />);

    expect(await screen.findByText("57.000đ", { selector: "dd" })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/staff\/revenue$/);
    expect(screen.getByText("Hôm nay").parentElement).toHaveTextContent(
      "57.000đ1 giao dịch",
    );
    expect(screen.getByText("Tổng cộng").parentElement).toHaveTextContent(
      "182.000đ3 giao dịch",
    );
    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("BL-AB12CD · Khách hàng mẫu");
    expect(row).toHaveTextContent("10:05 13/11/2026 · Thẻ · Mã VNPay 15735108");
    expect(within(row).getByText("+57.000đ")).toBeInTheDocument();
    unmount();

    render(<RevenueView />);
    expect(await screen.findByText("Chưa có giao dịch nào")).toBeInTheDocument();
  });

  it("CT-62: lỗi thì hiện câu báo tiếng Việt kèm Thử lại; Thử lại thành công thì hiện số liệu", async () => {
    const user = userEvent.setup();
    mockFetch(
      jsonResponse(
        { statusCode: 403, message: "Chỉ nhân viên được truy cập" },
        403,
      ),
      jsonResponse(REVENUE),
    );
    render(<RevenueView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chỉ nhân viên được truy cập",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("BL-AB12CD · Khách hàng mẫu")).toBeInTheDocument();
  });
});