import { beforeEach, describe, expect, it } from "vitest";
import {
  cartCount,
  cartSubtotal,
  lineKey,
  useCartStore,
  type CartItem,
} from "./cart-store";

// Một ly Cà phê sữa đá size M có trân châu đen và kem cheese
const LINE: CartItem = {
  productId: 2,
  name: "Cà phê sữa đá",
  imageUrl: "/images/products/ca-phe-sua-da.jpg",
  size: "M",
  toppingIds: [1, 4],
  toppingNames: ["Trân châu đen", "Kem cheese"],
  unitPrice: 52000,
  quantity: 1,
};

const cart = () => useCartStore.getState();

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe("Kho giỏ hàng (CT-33 – CT-36)", () => {
  it("CT-33: cùng món, cùng size, cùng bộ topping (khác thứ tự) thì gộp dòng, cộng dồn số lượng", () => {
    cart().addItem(LINE);
    cart().addItem({ ...LINE, toppingIds: [4, 1], quantity: 2 });

    expect(cart().items).toHaveLength(1);
    expect(cart().items[0].quantity).toBe(3);
  });

  it("CT-34: khác size hoặc khác topping thì là dòng riêng", () => {
    cart().addItem(LINE);
    cart().addItem({ ...LINE, size: "L", unitPrice: 57000 });
    cart().addItem({ ...LINE, toppingIds: [1], unitPrice: 42000 });

    expect(cart().items).toHaveLength(3);
    expect(cartCount(cart().items)).toBe(3);
    expect(cartSubtotal(cart().items)).toBe(52000 + 57000 + 42000);
  });

  it("CT-35: số lượng tối thiểu là 1; xóa dòng; xóa toàn bộ giỏ", () => {
    cart().addItem(LINE);
    cart().addItem({ ...LINE, size: "S", unitPrice: 47000 });
    const key = lineKey(LINE);

    cart().setQuantity(key, 0);
    expect(cart().items[0].quantity).toBe(1);
    cart().setQuantity(key, 4);
    expect(cartSubtotal(cart().items)).toBe(52000 * 4 + 47000);

    cart().removeItem(key);
    expect(cart().items.map((item) => item.size)).toEqual(["S"]);
    cart().clear();
    expect(cart().items).toEqual([]);
  });

  it("CT-36: giỏ được lưu vào localStorage để tải lại trang vẫn còn", () => {
    cart().addItem(LINE);

    const saved = JSON.parse(localStorage.getItem("brewlite-cart") ?? "{}");
    expect(saved.state.items).toEqual([LINE]);
  });
});