import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCartStore } from "@/store/cart-store";
import ProductDetailView from "./ProductDetailView";

// Dữ liệu giả giống API GET /products/:id trả về
const PRODUCT = {
  id: 6,
  name: "Trà đào cam sả",
  description: "Trà đen thơm mùi sả.",
  category: "Trà",
  price: 45000,
  imageUrl: "/images/products/tra-dao-cam-sa.jpg",
  stock: 3,
  sizes: [
    { size: "S", extra: 0 },
    { size: "M", extra: 5000 },
    { size: "L", extra: 10000 },
  ],
  toppings: [
    { id: 1, name: "Trân châu đen", price: 5000, available: true },
    { id: 2, name: "Thạch đào", price: 7000, available: true },
    { id: 3, name: "Kem cheese", price: 10000, available: false },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Thay fetch của trình duyệt bằng hàm giả, không cần chạy API thật
function mockFetch(...results: Array<Response | Error>) {
  const fetchMock = vi.fn();
  for (const result of results) {
    if (result instanceof Error) fetchMock.mockRejectedValueOnce(result);
    else fetchMock.mockResolvedValueOnce(result);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Phần tổng tiền: dòng "Đơn giá" và "Thành tiền"
function priceOf(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn chi tiết món (CT-25 – CT-31)", () => {
  it("CT-25: gọi GET /products/:id, hiện tên, mô tả, số ly còn, 3 size và topping", async () => {
    const fetchMock = mockFetch(jsonResponse(PRODUCT));
    render(<ProductDetailView id={6} />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải món...");
    expect(
      await screen.findByRole("heading", { name: "Trà đào cam sả" }),
    ).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/products\/6$/);
    expect(screen.getByText("Còn 3 ly")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Size S/ })).toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(priceOf("Thành tiền")).toBe("45.000đ");
  });

  it("CT-26: đổi size, topping, số lượng thì giá cập nhật ngay theo BR-01", async () => {
    const user = userEvent.setup();
    mockFetch(jsonResponse(PRODUCT));
    render(<ProductDetailView id={6} />);
    await screen.findByRole("heading", { name: "Trà đào cam sả" });

    await user.click(screen.getByRole("radio", { name: /Size L/ }));
    expect(priceOf("Đơn giá")).toBe("55.000đ");

    await user.click(screen.getByRole("checkbox", { name: /Trân châu đen/ }));
    await user.click(screen.getByRole("checkbox", { name: /Thạch đào/ }));
    expect(priceOf("Đơn giá")).toBe("67.000đ");

    await user.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    expect(priceOf("Thành tiền")).toBe("134.000đ");

    // Bỏ chọn topping thì trừ lại đúng giá topping đó
    await user.click(screen.getByRole("checkbox", { name: /Thạch đào/ }));
    expect(priceOf("Đơn giá")).toBe("60.000đ");
  });

  it("CT-27: topping không đủ nguyên liệu bị khóa", async () => {
    mockFetch(jsonResponse(PRODUCT));
    render(<ProductDetailView id={6} />);

    expect(
      await screen.findByRole("checkbox", { name: /Kem cheese \(hết\)/ }),
    ).toBeDisabled();
  });

  it("CT-28: số lượng nhỏ nhất là 1, lớn nhất bằng số ly còn", async () => {
    const user = userEvent.setup();
    mockFetch(jsonResponse(PRODUCT));
    render(<ProductDetailView id={6} />);
    await screen.findByRole("heading", { name: "Trà đào cam sả" });

    const minus = screen.getByRole("button", { name: "Giảm số lượng" });
    const plus = screen.getByRole("button", { name: "Tăng số lượng" });
    expect(minus).toBeDisabled();

    await user.click(plus);
    await user.click(plus);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(plus).toBeDisabled();
  });

  it('CT-29: món hết nguyên liệu hiện "Hết món" và khóa mọi lựa chọn', async () => {
    mockFetch(jsonResponse({ ...PRODUCT, stock: 0 }));
    render(<ProductDetailView id={6} />);

    expect(await screen.findByText("Hết món")).toBeInTheDocument();
    expect(screen.queryByText(/Còn \d+ ly/)).not.toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: "Tăng số lượng" }),
    ).toBeDisabled();
  });

  it('CT-30: món không tồn tại (404) hoặc mã món sai hiện "Không tìm thấy món" kèm liên kết về menu', async () => {
    mockFetch(jsonResponse({ message: "Không tìm thấy món" }, 404));
    const { unmount } = render(<ProductDetailView id={999} />);

    expect(await screen.findByText("Không tìm thấy món")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute(
      "href",
      "/",
    );
    unmount();

    // Mã món không phải số nguyên dương thì không gọi API
    const fetchMock = mockFetch();
    render(<ProductDetailView id={Number("abc")} />);
    expect(screen.getByText("Không tìm thấy món")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CT-31: lỗi mạng hiện câu tiếng Việt, bấm Thử lại thì tải lại", async () => {
    const user = userEvent.setup();
    mockFetch(new TypeError("Failed to fetch"), jsonResponse(PRODUCT));
    render(<ProductDetailView id={6} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
    );
    await user.click(within(alert).getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByRole("heading", { name: "Trà đào cam sả" }),
    ).toBeInTheDocument();
  });
});

describe("Thêm món vào giỏ từ trang chi tiết (CT-32)", () => {
  it("CT-32: bấm Thêm vào giỏ lưu đúng size, topping, số lượng, đơn giá; món hết thì không thêm được", async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [] });
    mockFetch(jsonResponse(PRODUCT));
    const { unmount } = render(<ProductDetailView id={6} />);
    await screen.findByRole("heading", { name: "Trà đào cam sả" });

    await user.click(screen.getByRole("radio", { name: /Size M/ }));
    await user.click(screen.getByRole("checkbox", { name: /Thạch đào/ }));
    await user.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ" }));

    expect(useCartStore.getState().items).toEqual([
      {
        productId: 6,
        name: "Trà đào cam sả",
        imageUrl: "/images/products/tra-dao-cam-sa.jpg",
        size: "M",
        toppingIds: [2],
        toppingNames: ["Thạch đào"],
        unitPrice: 57000,
        quantity: 2,
      },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã thêm 2 ly vào giỏ.",
    );
    expect(screen.getByRole("link", { name: "Xem giỏ hàng" })).toHaveAttribute(
      "href",
      "/cart",
    );
    unmount();

    mockFetch(jsonResponse({ ...PRODUCT, stock: 0 }));
    render(<ProductDetailView id={6} />);
    expect(
      await screen.findByRole("button", { name: "Thêm vào giỏ" }),
    ).toBeDisabled();
  });
});