import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrdersView from "./OrdersView";

// Giống API GET /orders/me trả về: đơn mới nhất trước
const ORDERS = [
  {
    id: 16,
    code: "BL-MOI123",
    status: "PAID",
    subtotal: 102000,
    discount: 10200,
    total: 91800,
    promotionCode: "GIAM10",
    paymentMethod: "CARD",
    expiresAt: "2026-11-13T03:10:00.000Z",
    createdAt: "2026-11-13T03:05:00.000Z",
    refundStatus: null,
    items: [
      {
        productId: 2,
        productName: "Cà phê sữa đá",
        size: "M",
        toppings: [],
        quantity: 3,
        unitPrice: 34000,
        lineTotal: 102000,
      },
    ],
  },
  {
    id: 9,
    code: "BL-CU4567",
    status: "CANCELLED",
    subtotal: 50000,
    discount: 0,
    total: 50000,
    promotionCode: null,
    paymentMethod: "WALLET",
    expiresAt: "2026-11-12T08:05:00.000Z",
    createdAt: "2026-11-12T08:00:00.000Z",
    refundStatus: null,
    items: [
      {
        productId: 1,
        productName: "Cà phê đen đá",
        size: "S",
        toppings: [],
        quantity: 2,
        unitPrice: 25000,
        lineTotal: 50000,
      },
    ],
  },
];

function json(body: unknown, status = 200) {
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

describe("Trang lịch sử đơn (CT-78)", () => {
  it("CT-78: gọi GET /orders/me, mỗi đơn có mã, giờ đặt, nhãn trạng thái tiếng Việt, tổng tiền và dẫn tới chi tiết; chưa có đơn thì báo trống; lỗi thì có Thử lại", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(json(ORDERS));
    const { unmount } = render(<OrdersView />);

    const first = await screen.findByRole("link", { name: "Đơn BL-MOI123" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/orders\/me$/);
    expect(first).toHaveAttribute("href", "/orders/16");
    expect(first).toHaveTextContent("Đã thanh toán");
    expect(first).toHaveTextContent("10:05 13/11/2026 · Thẻ · 3 ly");
    expect(first).toHaveTextContent("Cà phê sữa đá");
    expect(within(first).getByText("91.800đ")).toBeInTheDocument();
    const second = screen.getByRole("link", { name: "Đơn BL-CU4567" });
    expect(second).toHaveTextContent("Đã hủy");
    expect(second).toHaveTextContent("Ví · 2 ly");
    unmount();

    mockFetch(json([]));
    const empty = render(<OrdersView />);
    expect(
      await screen.findByText("Bạn chưa có đơn hàng nào"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Menu" })).toHaveAttribute(
      "href",
      "/",
    );
    empty.unmount();

    mockFetch(
      json({ statusCode: 500, message: "Internal server error" }, 500),
      json(ORDERS),
    );
    render(<OrdersView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Hệ thống đang bận, vui lòng thử lại sau.",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByRole("link", { name: "Đơn BL-MOI123" }),
    ).toBeInTheDocument();
  });
});