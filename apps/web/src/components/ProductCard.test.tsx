import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductCard from "./ProductCard";

const product = {
  id: 14,
  name: "Sinh tố bơ",
  description: "Bơ sáp xay cùng sữa đặc và sữa tươi.",
  category: "Nước ép, sinh tố",
  price: 55000,
  imageUrl: "/images/products/sinh-to-bo.jpg",
};

describe("Thẻ món (CT-19)", () => {
  it("CT-19: món không còn pha được hiện nhãn Hết món, món còn thì không", () => {
    const { rerender } = render(
      <ProductCard product={{ ...product, stock: 0 }} />,
    );
    expect(screen.getByText("Hết món")).toBeInTheDocument();

    rerender(<ProductCard product={{ ...product, stock: 5 }} />);
    expect(screen.queryByText("Hết món")).not.toBeInTheDocument();
    expect(screen.getByText("55.000đ")).toBeInTheDocument();
  });
});