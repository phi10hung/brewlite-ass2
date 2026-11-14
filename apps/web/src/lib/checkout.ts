import { lineKey, type CartItem } from "@/store/cart-store";
import { apiFetch } from "./api";

// Hàm gọi API cho giỏ hàng và Checkout (FR-05 – FR-07, Sequence-01).
// Web chỉ gửi món, size, topping, số lượng; giá do server tính (BR-02).

export type PaymentMethod = "WALLET" | "CARD";

// Một dòng giỏ đúng dạng API nhận: không gửi tên, ảnh, giá
function toOrderItem(item: CartItem) {
  return {
    productId: item.productId,
    size: item.size,
    toppingIds: item.toppingIds,
    quantity: item.quantity,
  };
}

// POST /products/availability (FR-05): số ly tối đa của một dòng,
// sau khi trừ nguyên liệu của các dòng khác trong giỏ
export async function getMaxQuantity(
  items: CartItem[],
  line: CartItem,
): Promise<number> {
  const key = lineKey(line);
  const result = await apiFetch<{ maxQuantity: number }>(
    "/products/availability",
    {
      method: "POST",
      body: JSON.stringify({
        items: items.filter((item) => lineKey(item) !== key).map(toOrderItem),
        line: {
          productId: line.productId,
          size: line.size,
          toppingIds: line.toppingIds,
        },
      }),
    },
  );
  return result.maxQuantity;
}

// POST /promotions/validate (FR-07): mã sai thì API trả 400 kèm lý do tiếng Việt
export type PromotionCheck = { code: string; discount: number; total: number };

export function validatePromotion(
  code: string,
  subtotal: number,
): Promise<PromotionCheck> {
  return apiFetch<PromotionCheck>("/promotions/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
}

// Kiểm tra ở web trước khi gửi (NFR-06), cùng câu báo với API
export function checkPromotionCode(code: string): string | null {
  return code.trim() === "" ? "Vui lòng nhập mã giảm giá" : null;
}

// POST /orders (FR-10): 201 { orderId, code, total, expiresAt }
export type CreatedOrder = {
  orderId: number;
  code: string;
  total: number;
  expiresAt: string;
};

export function createOrder(
  items: CartItem[],
  paymentMethod: PaymentMethod,
  promotionCode?: string,
): Promise<CreatedOrder> {
  return apiFetch<CreatedOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      items: items.map(toOrderItem),
      paymentMethod,
      ...(promotionCode ? { promotionCode } : {}),
    }),
  });
}

// POST /payments (FR-14, FR-15): Idempotency-Key tạo một lần cho mỗi lần bấm Thanh toán
export function createPayment(
  orderId: number,
  method: PaymentMethod,
  idempotencyKey: string,
): Promise<{ txnRef: string; payUrl: string }> {
  return apiFetch<{ txnRef: string; payUrl: string }>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ orderId, method }),
  });
}

// Đơn chờ thanh toán còn hạn của khách (FR-06 tiêu chí 8), lấy từ GET /orders/me
export type PendingOrder = { id: number; code: string; expiresAt: string };
type MyOrder = PendingOrder & { status: string };

export async function findPendingOrder(): Promise<PendingOrder | null> {
  const orders = await apiFetch<MyOrder[]>("/orders/me");
  const now = Date.now();
  const pending = orders.find(
    (order) =>
      (order.status === "PENDING" || order.status === "PAYMENT_FAILED") &&
      new Date(order.expiresAt).getTime() > now,
  );
  return pending
    ? { id: pending.id, code: pending.code, expiresAt: pending.expiresAt }
    : null;
}

// Chuyển sang trang thanh toán VNPay. Tách riêng để test thay bằng hàm giả.
export function openPayUrl(payUrl: string) {
  window.location.assign(payUrl);
}
