import { describe, expect, it } from "vitest";
import { unitPrice, type ProductDetail } from "./products";

const PRODUCT: ProductDetail = {
  id: 2,
  name: "Cà phê sữa đá",
  description: "Cà phê phin pha sữa đặc.",
  category: "Cà phê",
  price: 29000,
  imageUrl: "/images/products/ca-phe-sua-da.jpg",
  stock: 10,
  sizes: [
    { size: "S", extra: 0 },
    { size: "M", extra: 5000 },
    { size: "L", extra: 10000 },
  ],
  toppings: [
    { id: 1, name: "Trân châu đen", price: 5000, available: true },
    { id: 4, name: "Kem cheese", price: 10000, available: true },
  ],
};

describe("unitPrice – đơn giá một ly theo BR-01 (CT-23)", () => {
  it("size S, không topping bằng giá món", () => {
    expect(unitPrice(PRODUCT, "S", [])).toBe(29000);
  });

  it("cộng phụ thu size và giá từng topping đã chọn", () => {
    expect(unitPrice(PRODUCT, "M", [1])).toBe(29000 + 5000 + 5000);
    expect(unitPrice(PRODUCT, "L", [1, 4])).toBe(29000 + 10000 + 5000 + 10000);
  });
});