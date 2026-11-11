import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getSession, saveSession } from "@/lib/session";
import { useCartStore } from "@/store/cart-store";
import Navbar, { NAV_LINKS } from "./Navbar";

// Navbar có nút Đăng xuất dùng router của Next.js; thay bằng hàm giả khi test
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("Navbar (CT-01 – CT-02)", () => {
  it("hiển thị tên BrewLite và dẫn về trang chủ", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "BrewLite" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("hiển thị đủ các mục điều hướng", () => {
    render(<Navbar />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav).toBeInTheDocument();
    for (const link of NAV_LINKS) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href,
      );
    }
  });
});
describe("Số ly trong giỏ trên thanh điều hướng (CT-37)", () => {
  it("CT-37: mục Giỏ hàng dẫn tới /cart, số ly cập nhật ngay khi giỏ thay đổi", () => {
    useCartStore.setState({ items: [] });
    render(<Navbar />);

    const cartLink = screen.getByRole("link", { name: /Giỏ hàng/ });
    expect(cartLink).toHaveAttribute("href", "/cart");
    expect(cartLink).toHaveAccessibleName("Giỏ hàng, 0 ly");

    act(() => {
      useCartStore.getState().addItem({
        productId: 1,
        name: "Cà phê đen đá",
        imageUrl: "/images/products/ca-phe-den-da.jpg",
        size: "S",
        toppingIds: [],
        toppingNames: [],
        unitPrice: 25000,
        quantity: 2,
      });
    });
    expect(cartLink).toHaveAccessibleName("Giỏ hàng, 2 ly");
    expect(cartLink).toHaveTextContent("2");
  });
});

describe("Đăng nhập, đăng xuất trên thanh điều hướng (CT-52)", () => {
  it("CT-52: chưa đăng nhập có nút Đăng nhập; đã đăng nhập thì Đăng xuất xóa token và giỏ hàng", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/login",
    );

    act(() => {
      saveSession({
        accessToken: "token-thu",
        user: {
          id: 1,
          name: "Khách hàng mẫu",
          email: "khach@brewlite.vn",
          role: "CUSTOMER",
          loyaltyPoints: 0,
        },
      });
      useCartStore.getState().addItem({
        productId: 1,
        name: "Cà phê đen đá",
        imageUrl: "/images/products/ca-phe-den-da.jpg",
        size: "S",
        toppingIds: [],
        toppingNames: [],
        unitPrice: 25000,
        quantity: 1,
      });
    });
    expect(screen.getByText("Khách hàng mẫu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(getSession()).toBeNull();
    expect(useCartStore.getState().items).toEqual([]);
    expect(push).toHaveBeenCalledWith("/");
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeInTheDocument();
  });
});