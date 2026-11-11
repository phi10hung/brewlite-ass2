import { apiFetch } from "./api";

// Một món trong menu, đúng dữ liệu API GET /products trả về.
// stock = số ly size S, không topping, còn pha được từ nguyên liệu trong kho (BR-03);
// stock = 0 nghĩa là món "Hết món" (FR-02).
export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
};

// Lấy toàn bộ menu. Lỗi (mất mạng, server lỗi) được apiFetch đổi thành câu tiếng Việt.
export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/products");
}
// Một size và tiền phụ thu của size đó (BR-01), API trả về cùng chi tiết món
export type ProductSize = {
  size: "S" | "M" | "L";
  extra: number;
};

// Topping khách chọn thêm. available = false khi kho không đủ nguyên liệu cho topping này.
export type Topping = {
  id: number;
  name: string;
  price: number;
  available: boolean;
};

// Chi tiết một món, đúng dữ liệu API GET /products/:id trả về (FR-03)
export type ProductDetail = Product & {
  sizes: ProductSize[];
  toppings: Topping[];
};

// Lấy chi tiết một món. Món không tồn tại thì API trả 404, apiFetch ném ApiError có status 404.
export function getProduct(id: number): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/products/${id}`);
}

// Đơn giá một ly = giá món + phụ thu size + tổng giá các topping đã chọn (BR-01).
// Mọi con số lấy từ dữ liệu API trả về, web không tự đặt giá (BR-02).
export function unitPrice(
  product: ProductDetail,
  size: ProductSize["size"],
  toppingIds: number[],
): number {
  const extra = product.sizes.find((item) => item.size === size)?.extra ?? 0;
  const toppings = product.toppings
    .filter((topping) => toppingIds.includes(topping.id))
    .reduce((sum, topping) => sum + topping.price, 0);
  return product.price + extra + toppings;
}