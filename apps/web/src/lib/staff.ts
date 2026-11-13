import { apiFetch } from "./api";
import type { OrderStatus, RefundStatus } from "./order-status";

// Các hàm gọi API của Nhân viên (StaffModule, ADR 003). API trả 403 nếu tài khoản không phải Nhân viên.

export type PaymentMethod = "WALLET" | "CARD";

export type OrderItem = {
  productId: number;
  productName: string;
  size: "S" | "M" | "L";
  toppings: string[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

// Đơn hàng như GET /staff/orders trả về, kèm tên khách
export type StaffOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  paymentMethod: PaymentMethod;
  expiresAt: string;
  createdAt: string;
  refundStatus: RefundStatus | null;
  items: OrderItem[];
  customerName: string;
};

// GET /staff/orders?status=: không truyền status thì lấy mọi đơn (FR-22)
export function getStaffOrders(status?: OrderStatus): Promise<StaffOrder[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<StaffOrder[]>(`/staff/orders${query}`);
}

// PATCH /staff/orders/:id/status: bước sai trả 400, đơn vừa đổi trạng thái trả 409 (FR-21, FR-22)
export function updateOrderStatus(
  id: number,
  status: OrderStatus,
): Promise<StaffOrder> {
  return apiFetch<StaffOrder>(`/staff/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type RevenueTransaction = {
  id: number;
  orderId: number;
  method: PaymentMethod;
  amount: number;
  transactionNo: string | null;
  createdAt: string;
  orderCode: string;
  customerName: string;
};

export type Revenue = {
  total: number;
  count: number;
  todayTotal: number;
  todayCount: number;
  transactions: RevenueTransaction[];
};

// GET /staff/revenue: chỉ giao dịch thành công của đơn không hủy, không hoàn tiền (FR-23, BR-14)
export function getRevenue(): Promise<Revenue> {
  return apiFetch<Revenue>("/staff/revenue");
}

export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  stock: number;
  lowStock: boolean;
};

// GET /staff/ingredients: tồn kho từng nguyên liệu, lowStock = sắp hết (FR-24)
export function getIngredients(): Promise<Ingredient[]> {
  return apiFetch<Ingredient[]>("/staff/ingredients");
}

// POST /staff/ingredients/:id/restock: cộng thêm số lượng, trả tồn kho mới (FR-24)
export function restockIngredient(
  id: number,
  amount: number,
): Promise<Ingredient> {
  return apiFetch<Ingredient>(`/staff/ingredients/${id}/restock`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// Giới hạn mỗi lần nhập, giống API
export const MAX_RESTOCK = 1_000_000;

// Kiểm tra số lượng nhập trước khi gửi, cùng câu báo lỗi với API (FR-24, NFR-06).
// Hợp lệ thì trả null.
export function validateRestock(value: string): string | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return "Số lượng nhập phải là số nguyên";
  const amount = Number(text);
  if (amount < 1) return "Số lượng nhập phải lớn hơn 0";
  if (amount > MAX_RESTOCK) return "Số lượng nhập tối đa 1.000.000 mỗi lần";
  return null;
}