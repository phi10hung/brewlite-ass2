import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openPayUrl } from "@/lib/checkout";
import { useCartStore, type CartItem } from "@/store/cart-store";
import CheckoutView from "./CheckoutView";

// Thay router của Next.js bằng hàm giả để biết trang được chuyển tới đâu
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// Không chuyển trang thật sang VNPay trong test
vi.mock("@/lib/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkout")>()),
  openPayUrl: vi.fn(),
}));

const SESSION = {
  accessToken: "token-thu",
  user: {
    id: 1,
    name: "Khách hàng mẫu",
    email: "khach@brewlite.vn",
    role: "CUSTOMER",
    loyaltyPoints: 0,
  },
};

const DEN_DA: CartItem = {
  productId: 1,
  name: "Cà phê đen đá",
  imageUrl: "/images/products/ca-phe-den-da.jpg",
  size: "S",
  toppingIds: [],
  toppingNames: [],
  unitPrice: 25000,
  quantity: 2,
};

const TRA_DAO: CartItem = {
  productId: 6,
  name: "Trà đào cam sả",
  imageUrl: "/images/products/tra-dao-cam-sa.jpg",
  size: "L",
  toppingIds: [1, 2],
  toppingNames: ["Trân châu đen", "Trân châu trắng"],
  unitPrice: 73000,
  quantity: 1,
};

const IN_10_MINUTES = new Date(Date.now() + 10 * 60_000).toISOString();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API giả: mỗi đường dẫn một câu trả lời; GET /orders/me mặc định chưa có đơn
function mockApi(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname;
    const key = `${init.method ?? "GET"} ${path}`;
    const route = routes[key] ?? (key === "GET /orders/me" ? () => json([]) : null);
    if (!route) throw new Error(`Chưa giả lập ${key}`);
    return Promise.resolve(route());
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof mockApi>, method: string, path: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      (init?.method ?? "GET") === method && new URL(url).pathname === path,
  );
}

function loginAndFill(items: CartItem[]) {
  localStorage.setItem("brewlite-auth", JSON.stringify(SESSION));
  useCartStore.setState({ items });
}

// Giá trị ở phần tổng tiền, theo tên dòng (Tạm tính, Giảm giá, Tổng cộng)
function summary(label: string) {
  const totals = screen.getByRole("region", { name: "Tổng tiền" });
  return within(totals).getByText(label).nextElementSibling?.textContent;
}

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
  vi.mocked(openPayUrl).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn Checkout (CT-69 – CT-74)", () => {
  it("CT-69: chưa đăng nhập thì chuyển tới đăng nhập rồi quay lại Checkout; giỏ trống thì về trang giỏ hàng", () => {
    useCartStore.setState({ items: [DEN_DA] });
    const { unmount } = render(<CheckoutView />);
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fcheckout");
    unmount();

    replace.mockClear();
    mockApi({});
    loginAndFill([]);
    render(<CheckoutView />);
    expect(replace).toHaveBeenCalledWith("/cart");
  });

  it("CT-70: hiện từng món, tạm tính, giảm giá, tổng cộng; có đơn chờ còn hạn thì nhắc kèm đường dẫn tới đơn", async () => {
    mockApi({
      "GET /orders/me": () =>
        json([
          { id: 9, code: "BL-CU1234", status: "PENDING", expiresAt: IN_10_MINUTES },
        ]),
    });
    loginAndFill([DEN_DA, TRA_DAO]);
    render(<CheckoutView />);

    expect(await screen.findByText(/Bạn đang có đơn BL-CU1234/)).toHaveTextContent(
      "Đặt đơn mới sẽ hủy đơn cũ",
    );
    expect(screen.getByRole("link", { name: "Xem đơn BL-CU1234" })).toHaveAttribute(
      "href",
      "/orders/9",
    );
    const list = screen.getByRole("region", { name: "Đơn hàng của bạn" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("1 × Trà đào cam sả")).toBeInTheDocument();
    expect(
      within(list).getByText("Size L · Trân châu đen, Trân châu trắng"),
    ).toBeInTheDocument();
    expect(within(list).getByText("50.000đ")).toBeInTheDocument();
    expect(summary("Tạm tính")).toBe("123.000đ");
    expect(summary("Giảm giá")).toBe("0đ");
    expect(summary("Tổng cộng")).toBe("123.000đ");
    expect(screen.getByRole("radio", { name: /Ví/ })).toBeChecked();
  });

  it("CT-71: mã trống báo lỗi ngay; mã sai hiện lý do server, tổng không đổi; mã đúng hiện số tiền giảm và tổng sau giảm", async () => {
    const user = userEvent.setup();
    const answers = [
      json({ statusCode: 400, message: "Mã giảm giá đã hết hạn" }, 400),
      json({ code: "GIAM10", discount: 12300, total: 110700 }),
    ];
    const fetchMock = mockApi({
      "POST /promotions/validate": () => answers.shift()!,
    });
    loginAndFill([DEN_DA, TRA_DAO]);
    render(<CheckoutView />);

    const input = screen.getByRole("textbox", { name: "Mã giảm giá" });
    const apply = screen.getByRole("button", { name: "Áp dụng" });
    await user.click(apply);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Vui lòng nhập mã giảm giá",
    );
    expect(callsTo(fetchMock, "POST", "/promotions/validate")).toHaveLength(0);

    await user.type(input, "HETHAN");
    await user.click(apply);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mã giảm giá đã hết hạn",
    );
    expect(summary("Tổng cộng")).toBe("123.000đ");

    await user.clear(input);
    await user.type(input, " giam10 ");
    await user.click(apply);
    expect(
      await screen.findByText("Đã áp dụng mã GIAM10: giảm 12.300đ"),
    ).toBeInTheDocument();
    const [, init] = callsTo(fetchMock, "POST", "/promotions/validate")[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      code: "giam10",
      subtotal: 123000,
    });
    expect(summary("Giảm giá")).toBe("−12.300đ");
    expect(summary("Tổng cộng")).toBe("110.700đ");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("CT-72: bấm Thanh toán thì tạo đơn (không gửi giá), tạo giao dịch có Idempotency-Key rồi chuyển sang VNPay; nút bị khóa, giỏ giữ nguyên", async () => {
    const user = userEvent.setup();
    let finishPayment: (response: Response) => void = () => {};
    const fetchMock = mockApi({
      "POST /promotions/validate": () =>
        json({ code: "GIAM10", discount: 12300, total: 110700 }),
      "POST /orders": () =>
        json({ orderId: 15, code: "BL-MOI123", total: 110700, expiresAt: IN_10_MINUTES }, 201),
    });
    // POST /payments trả chậm để thấy nút bị khóa trong lúc chờ
    const routed = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, init: RequestInit = {}) =>
      new URL(url).pathname === "/payments"
        ? new Promise<Response>((resolve) => (finishPayment = resolve))
        : routed(url, init),
    );
    loginAndFill([DEN_DA, TRA_DAO]);
    render(<CheckoutView />);

    await user.type(screen.getByRole("textbox", { name: "Mã giảm giá" }), "GIAM10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByText(/Đã áp dụng mã GIAM10/);
    await user.click(screen.getByRole("radio", { name: /Thẻ/ }));
    await user.click(screen.getByRole("button", { name: "Thanh toán 110.700đ" }));

    expect(
      await screen.findByRole("button", { name: "Đang chuyển sang VNPay..." }),
    ).toBeDisabled();
    const [, orderInit] = callsTo(fetchMock, "POST", "/orders")[0];
    expect(JSON.parse(String(orderInit?.body))).toEqual({
      items: [
        { productId: 1, size: "S", toppingIds: [], quantity: 2 },
        { productId: 6, size: "L", toppingIds: [1, 2], quantity: 1 },
      ],
      paymentMethod: "CARD",
      promotionCode: "GIAM10",
    });
    const [, paymentInit] = callsTo(fetchMock, "POST", "/payments")[0];
    expect(JSON.parse(String(paymentInit?.body))).toEqual({
      orderId: 15,
      method: "CARD",
    });
    expect(
      new Headers(paymentInit?.headers).get("Idempotency-Key"),
    ).toMatch(/^[0-9a-f-]{36}$/);

    finishPayment(
      json({ txnRef: "BLMOI123ABCDEF", payUrl: "https://sandbox.vnpayment.vn/thu" }, 201),
    );
    await vi.waitFor(() =>
      expect(openPayUrl).toHaveBeenCalledWith("https://sandbox.vnpayment.vn/thu"),
    );
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("CT-73: tạo đơn lỗi (thiếu nguyên liệu) thì báo lỗi tiếng Việt, ở lại trang, giữ giỏ, mở lại nút", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({
      "POST /orders": () =>
        json(
          {
            statusCode: 400,
            message: "Món Trà đào cam sả không đủ nguyên liệu, chỉ còn pha được 0 ly",
          },
          400,
        ),
    });
    loginAndFill([DEN_DA, TRA_DAO]);
    render(<CheckoutView />);

    await user.click(screen.getByRole("button", { name: "Thanh toán 123.000đ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Món Trà đào cam sả không đủ nguyên liệu, chỉ còn pha được 0 ly",
    );
    expect(callsTo(fetchMock, "POST", "/payments")).toHaveLength(0);
    expect(openPayUrl).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Thanh toán 123.000đ" })).toBeEnabled();
  });

  it("CT-74: đã tạo đơn nhưng tạo giao dịch lỗi thì báo lỗi kèm đường dẫn mở đơn để thanh toán tiếp", async () => {
    const user = userEvent.setup();
    mockApi({
      "POST /orders": () =>
        json({ orderId: 15, code: "BL-MOI123", total: 123000, expiresAt: IN_10_MINUTES }, 201),
      "POST /payments": () =>
        json({ statusCode: 503, message: "Service Unavailable" }, 503),
    });
    loginAndFill([DEN_DA, TRA_DAO]);
    render(<CheckoutView />);

    await user.click(screen.getByRole("button", { name: "Thanh toán 123.000đ" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Hệ thống đang bận, vui lòng thử lại sau.");
    expect(alert).toHaveTextContent("Đơn BL-MOI123 đã được tạo.");
    expect(
      within(alert).getByRole("link", { name: "Mở đơn để thanh toán tiếp" }),
    ).toHaveAttribute("href", "/orders/15");
    expect(openPayUrl).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});