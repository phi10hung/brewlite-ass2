import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openPaymentPage } from "@/lib/orders";
import { getSession } from "@/lib/session";
import OrderDetailView from "./OrderDetailView";

// Không chuyển trang thật sang VNPay trong test
vi.mock("@/lib/orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/orders")>()),
  openPaymentPage: vi.fn(),
}));

const SESSION = {
  accessToken: "token-thu",
  user: {
    id: 1,
    name: "Khách hàng mẫu",
    email: "khach@brewlite.vn",
    role: "CUSTOMER",
    loyaltyPoints: 9,
  },
};

// Giống API GET /orders/:id trả về
const ORDER = {
  id: 15,
  code: "BL-AB12CD",
  status: "PAID",
  subtotal: 128000,
  discount: 12800,
  total: 115200,
  promotionCode: "GIAM10",
  paymentMethod: "CARD",
  expiresAt: "2026-11-13T03:10:00.000Z",
  createdAt: "2026-11-13T03:05:00.000Z",
  refundStatus: null,
  items: [
    {
      productId: 5,
      productName: "Latte",
      size: "L",
      toppings: ["Shot espresso"],
      quantity: 1,
      unitPrice: 65000,
      lineTotal: 65000,
    },
    {
      productId: 3,
      productName: "Bạc xỉu",
      size: "S",
      toppings: [],
      quantity: 2,
      unitPrice: 31500,
      lineTotal: 63000,
    },
  ],
};

const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API giả: mỗi "phương thức + đường dẫn" một danh sách câu trả lời, dùng lần lượt
function mockApi(routes: Record<string, Response[]>) {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? "GET"} ${new URL(url).pathname}`;
    const next = routes[key]?.shift();
    if (!next) throw new Error(`Chưa giả lập ${key}`);
    return Promise.resolve(next);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof mockApi>, key: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      `${init?.method ?? "GET"} ${new URL(url).pathname}` === key,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("brewlite-auth", JSON.stringify(SESSION));
  vi.mocked(openPaymentPage).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Trang chi tiết đơn (CT-79 – CT-81)", () => {
  it("CT-79: hiện mã đơn, trạng thái, từng món (size, topping, số lượng, thành tiền), giảm giá, tổng tiền; đơn đã hủy có nhãn hoàn tiền; đơn không có thì báo lỗi", async () => {
    mockApi({ "GET /orders/15": [json(ORDER)] });
    const { unmount } = render(<OrderDetailView id="15" />);

    expect(
      await screen.findByRole("heading", { name: "Đơn BL-AB12CD" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Đã thanh toán")).toBeInTheDocument();
    expect(screen.getByText("10:05 13/11/2026 · Thẻ")).toBeInTheDocument();
    const lines = within(
      screen.getByRole("region", { name: "Các món" }),
    ).getAllByRole("listitem");
    expect(lines[0]).toHaveTextContent("1 × Latte");
    expect(lines[0]).toHaveTextContent("Size L · Shot espresso");
    expect(lines[0]).toHaveTextContent("65.000đ");
    expect(lines[1]).toHaveTextContent("2 × Bạc xỉu");
    expect(lines[1]).toHaveTextContent("63.000đ");
    expect(
      screen.getByText("Giảm giá (GIAM10)").nextElementSibling,
    ).toHaveTextContent("−12.800đ");
    expect(screen.getByText("Tổng cộng").nextElementSibling).toHaveTextContent(
      "115.200đ",
    );
    // Đơn đã thanh toán: không đếm ngược, không thanh toán tiếp, nhưng hủy được (BR-10)
    expect(screen.queryByRole("timer")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Thanh toán tiếp" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeInTheDocument();
    unmount();

    mockApi({
      "GET /orders/15": [
        json({ ...ORDER, status: "CANCELLED", refundStatus: "FAILED" }),
      ],
    });
    const cancelled = render(<OrderDetailView id="15" />);
    expect(await screen.findByText("Đang hoàn tiền")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hủy đơn" })).toBeNull();
    cancelled.unmount();

    mockApi({
      "GET /orders/99": [
        json({ statusCode: 404, message: "Không tìm thấy đơn hàng" }, 404),
      ],
    });
    render(<OrderDetailView id="99" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tìm thấy đơn hàng",
    );
    expect(
      screen.getByRole("link", { name: "Về đơn hàng của tôi" }),
    ).toHaveAttribute("href", "/orders");
  });

  it("CT-80: đơn chờ thanh toán có đồng hồ đếm ngược; Thanh toán tiếp gọi POST /payments với Idempotency-Key mới rồi chuyển sang VNPay; lỗi thì báo; hết giờ thì tải lại đơn", async () => {
    const user = userEvent.setup();
    const waiting = {
      ...ORDER,
      status: "PAYMENT_FAILED",
      expiresAt: inMs(299_000),
    };
    const fetchMock = mockApi({
      "GET /orders/15": [json(waiting)],
      "POST /payments": [
        json(
          { statusCode: 400, message: "Đơn đã hết thời gian thanh toán" },
          400,
        ),
        json(
          {
            txnRef: "BLAB12CDNEW123",
            payUrl: "https://sandbox.vnpayment.vn/thu",
          },
          201,
        ),
      ],
    });
    const { unmount } = render(<OrderDetailView id="15" />);

    expect(await screen.findByRole("timer")).toHaveTextContent(
      /Còn 0[45]:\d\d để thanh toán/,
    );
    const pay = screen.getByRole("button", { name: "Thanh toán tiếp" });
    await user.click(pay);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Đơn đã hết thời gian thanh toán",
    );
    expect(openPaymentPage).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Thanh toán tiếp" }));
    await waitFor(() =>
      expect(openPaymentPage).toHaveBeenCalledWith(
        "https://sandbox.vnpayment.vn/thu",
      ),
    );
    const payments = callsTo(fetchMock, "POST /payments");
    expect(JSON.parse(String(payments[1][1]?.body))).toEqual({
      orderId: 15,
      method: "CARD",
    });
    const keys = payments.map(([, init]) =>
      new Headers(init?.headers).get("Idempotency-Key"),
    );
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).not.toBe(keys[0]);
    unmount();

    // Còn hơn 1 giây: hết giờ thì tự tải lại, thấy đơn đã bị hủy
    const fetch2 = mockApi({
      "GET /orders/15": [
        json({ ...ORDER, status: "PENDING", expiresAt: inMs(1200) }),
        json({ ...ORDER, status: "CANCELLED" }),
      ],
    });
    render(<OrderDetailView id="15" />);
    expect(await screen.findByRole("timer")).toHaveTextContent("Còn 00:0");
    expect(
      await screen.findByText("Đã hủy", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(callsTo(fetch2, "GET /orders/15")).toHaveLength(2);
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("CT-81: hủy đơn đã thanh toán phải xác nhận; hủy xong hiện Đã hủy, Đang hoàn tiền và cập nhật điểm; đơn vừa đổi trạng thái thì báo lỗi rồi tải lại", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      "GET /orders/15": [json(ORDER)],
      "PATCH /orders/15/cancel": [
        json({ ...ORDER, status: "CANCELLED", refundStatus: "PENDING" }),
      ],
      "GET /auth/me": [json({ ...SESSION.user, loyaltyPoints: 0 })],
    });
    const confirm = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    const { unmount } = render(<OrderDetailView id="15" />);

    await user.click(await screen.findByRole("button", { name: "Hủy đơn" }));
    expect(confirm).toHaveBeenLastCalledWith(
      "Hủy đơn BL-AB12CD? Bạn sẽ được hoàn tiền qua VNPay và bị trừ lại điểm thưởng của đơn này.",
    );
    expect(callsTo(fetchMock, "PATCH /orders/15/cancel")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Hủy đơn" }));
    expect(await screen.findByText("Đã hủy đơn BL-AB12CD")).toBeInTheDocument();
    expect(screen.getByText("Đã hủy")).toBeInTheDocument();
    expect(screen.getByText("Đang hoàn tiền")).toBeInTheDocument();
    await waitFor(() => expect(getSession()?.user.loyaltyPoints).toBe(0));
    unmount();

    // Nhân viên vừa nhận đơn: 409, báo lỗi và tải lại thấy trạng thái mới
    const fetch2 = mockApi({
      "GET /orders/15": [json(ORDER), json({ ...ORDER, status: "PREPARING" })],
      "PATCH /orders/15/cancel": [
        json(
          {
            statusCode: 409,
            message: "Đơn đã thay đổi trạng thái, vui lòng tải lại",
          },
          409,
        ),
      ],
    });
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    render(<OrderDetailView id="15" />);
    await user.click(await screen.findByRole("button", { name: "Hủy đơn" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Đơn đã thay đổi trạng thái, vui lòng tải lại",
    );
    expect(await screen.findByText("Đang pha chế")).toBeInTheDocument();
    expect(callsTo(fetch2, "GET /orders/15")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Hủy đơn" })).toBeNull();
  });
});