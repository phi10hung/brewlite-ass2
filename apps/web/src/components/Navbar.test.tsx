import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCartStore } from "@/store/cart-store";
import Navbar, { NAV_LINKS } from "./Navbar";

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