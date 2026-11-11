import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Giỏ hàng lưu ở trình duyệt bằng Zustand + localStorage (ADR 002): tải lại trang vẫn còn giỏ (FR-04).
// Đơn giá ở đây chỉ để hiển thị; server tính lại giá khi tạo đơn (BR-02).

export type Size = "S" | "M" | "L";

// Một dòng trong giỏ: một món với một size và một bộ topping
export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string;
  size: Size;
  toppingIds: number[];
  toppingNames: string[];
  unitPrice: number;
  quantity: number;
};

// Cùng món, cùng size, cùng bộ topping (không kể thứ tự) là cùng một dòng (FR-04 tiêu chí 2)
export function lineKey(
  item: Pick<CartItem, "productId" | "size" | "toppingIds">,
): string {
  const toppings = [...item.toppingIds].sort((a, b) => a - b).join(",");
  return `${item.productId}-${item.size}-${toppings}`;
}

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      // Thêm món: trùng dòng thì cộng dồn số lượng, khác thì thêm dòng mới
      addItem: (item) =>
        set((state) => {
          const key = lineKey(item);
          const existing = state.items.find((line) => lineKey(line) === key);
          if (existing) {
            return {
              items: state.items.map((line) =>
                line === existing
                  ? { ...line, quantity: line.quantity + item.quantity }
                  : line,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      // Số lượng tối thiểu là 1; muốn bỏ món thì xóa dòng (FR-04 tiêu chí 3)
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((line) =>
            lineKey(line) === key
              ? { ...line, quantity: Math.max(1, Math.floor(quantity)) }
              : line,
          ),
        })),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((line) => lineKey(line) !== key),
        })),

      clear: () => set({ items: [] }),
    }),
    { name: "brewlite-cart", storage: createJSONStorage(() => localStorage) },
  ),
);

// Tổng số ly trong giỏ, hiện trên thanh điều hướng (FR-04 tiêu chí 5)
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, line) => sum + line.quantity, 0);
}

// Tạm tính = tổng thành tiền các dòng (FR-04 tiêu chí 4, BR-01)
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}