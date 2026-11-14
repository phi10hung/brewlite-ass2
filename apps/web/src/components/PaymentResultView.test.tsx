import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import { useCartStore, type CartItem } from "@/store/cart-store";
import PaymentResultView from "./PaymentResultView";

// Thay router của Next.js bằng hàm giả để biết trang được chuyển tới đâu
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

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

// Tham số VNPay trả về trên đường dẫn (rút gọn)
const QUERY =
  "?vnp_Amount=5000000&vnp_ResponseCode=00&vnp_TxnRef=BLAB12CDXYZ123&vnp_SecureHash=abc";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API giả: GET /payments/vnpay-return trả `result`, GET /auth/me trả 10 điểm
function mockApi(result: Response) {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new URL(url).pathname === "/auth/me"
        ? json({ ...SESSION.user, loyaltyPoints: 10 })
        : result,
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// VNPay chuyển khách về /payment/result kèm tham số
function openWith(query: string) {
  window.history.pushState({}, "", `/payment/result${query}`);
  localStorage.setItem("brewlite-auth", JSON.stringify(SESSION));
  useCartStore.setState({ items: [DEN_DA] });
  return render(<PaymentResultView />);
}

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Trang kết quả thanh toán (CT-75 – CT-77)", () => {
  it("CT-75: gửi nguyên tham số VNPay cho server; thành công thì hiện mã đơn, xóa giỏ, cập nhật điểm, 3 giây sau mở chi tiết đơn", async () => {
    const fetchMock = mockApi(
      json({
        orderId: 15,
        code: "BL-AB12CD",
        status: "PAID",
        message: "Thanh toán thành công",
      }),
    );
    openWith(QUERY);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang kiểm tra kết quả thanh toán",
    );
    expect(
      await screen.findByText("Thanh toán thành công"),
    ).toBeInTheDocument();
    expect(
      String(fetchMock.mock.calls[0][0]).endsWith(
        `/payments/vnpay-return${QUERY}`,
      ),
    ).toBe(true);
    expect(screen.getByText("BL-AB12CD")).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
    await waitFor(() => expect(getSession()?.user.loyaltyPoints).toBe(10));
    expect(screen.getByRole("link", { name: "Xem đơn ngay" })).toHaveAttribute(
      "href",
      "/orders/15",
    );

    // Chưa đủ 3 giây thì chưa chuyển trang
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders/15"), {
      timeout: 4000,
    });
  });

  it("CT-76: thất bại thì báo lý do tiếng Việt, giữ giỏ, có nút mở đơn để thanh toán lại; chưa xác minh được thì báo đang kiểm tra", async () => {
    mockApi(
      json({
        orderId: 15,
        code: "BL-AB12CD",
        status: "PAYMENT_FAILED",
        message: "Bạn đã hủy giao dịch",
      }),
    );
    const { unmount } = openWith(QUERY.replace("=00", "=24"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Thanh toán không thành công",
    );
    expect(screen.getByText("Bạn đã hủy giao dịch")).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Mở đơn để thanh toán lại" }),
    ).toHaveAttribute("href", "/orders/15");
    unmount();

    mockApi(
      json({
        orderId: 15,
        code: "BL-AB12CD",
        status: "PENDING",
        message: "Đang kiểm tra thanh toán",
      }),
    );
    openWith(QUERY);
    expect(
      await screen.findByText("Đang kiểm tra thanh toán"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem đơn BL-AB12CD" }),
    ).toHaveAttribute("href", "/orders/15");
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("CT-77: server từ chối kết quả (sai chữ ký) thì báo lỗi; đường dẫn không có tham số VNPay thì không gọi API", async () => {
    mockApi(
      json({ statusCode: 400, message: "Chữ ký VNPay không hợp lệ" }, 400),
    );
    const { unmount } = openWith(QUERY);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chữ ký VNPay không hợp lệ",
    );
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Xem đơn hàng của tôi" }),
    ).toHaveAttribute("href", "/orders");
    unmount();

    const fetchMock = mockApi(json({}));
    openWith("");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không có kết quả thanh toán để kiểm tra",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});