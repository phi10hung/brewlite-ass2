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