import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCartStore, type CartItem } from "@/store/cart-store";
import CartView from "./CartView";

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

function renderWith(items: CartItem[]) {
  useCartStore.setState({ items });
  return render(<CartView />);
}

// Dòng "Tạm tính" ở phần tổng tiền
function subtotal() {
  return screen.getByText("Tạm tính").nextElementSibling?.textContent;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn giỏ hàng (CT-38 – CT-41)", () => {
  it('CT-38: giỏ trống hiện "Giỏ hàng đang trống" và nút về Menu', () => {
    renderWith([]);

    expect(screen.getByText("Giỏ hàng đang trống")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Menu" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("CT-39: mỗi dòng có size, topping, đơn giá, thành tiền; tạm tính bằng tổng thành tiền", () => {
    renderWith([DEN_DA, TRA_DAO]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByText("Size L · Trân châu đen, Trân châu trắng"),
    ).toBeInTheDocument();
    expect(screen.getByText("25.000đ / ly")).toBeInTheDocument();
    expect(screen.getByText("50.000đ")).toBeInTheDocument();
    expect(subtotal()).toBe("123.000đ");
  });

  it("CT-40: tăng, giảm số lượng cập nhật thành tiền và tạm tính; tối thiểu là 1", async () => {
    const user = userEvent.setup();
    renderWith([DEN_DA, TRA_DAO]);

    await user.click(
      screen.getByRole("button", { name: "Tăng số lượng Trà đào cam sả size L" }),
    );
    expect(subtotal()).toBe("196.000đ");

    const minus = screen.getByRole("button", {
      name: "Giảm số lượng Cà phê đen đá size S",
    });
    await user.click(minus);
    expect(minus).toBeDisabled();
    expect(subtotal()).toBe("171.000đ");
  });

  it("CT-41: xóa một dòng; xóa toàn bộ giỏ sau khi xác nhận", async () => {
    const user = userEvent.setup();
    renderWith([DEN_DA, TRA_DAO]);

    await user.click(
      screen.getByRole("button", { name: "Xóa Cà phê đen đá size S" }),
    );
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(subtotal()).toBe("73.000đ");

    // Bấm Hủy ở hộp xác nhận thì giỏ giữ nguyên
    vi.stubGlobal("confirm", vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true));
    await user.click(screen.getByRole("button", { name: "Xóa toàn bộ giỏ" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Xóa toàn bộ giỏ" }));
    expect(screen.getByText("Giỏ hàng đang trống")).toBeInTheDocument();
  });
});