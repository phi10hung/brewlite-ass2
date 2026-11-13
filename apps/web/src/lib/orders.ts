import { apiFetch } from "./api";
import type { OrderStatus } from "./order-status";
import { getSession, saveSession, type User } from "./session";
import type { PaymentMethod, StaffOrder } from "./staff";

// Hàm gọi API đơn hàng của Khách hàng (FR-16 – FR-20).

// Đơn hàng như GET /orders/me, GET /orders/:id trả về (giống đơn của nhân viên, không có tên khách)
export type MyOrder = Omit<StaffOrder, "customerName">;

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  WALLET: "Ví",
  CARD: "Thẻ",
};

// Đơn còn chờ thanh toán: thanh toán tiếp hoặc hủy được (BR-05, BR-09)
export function isWaiting(order: Pick<MyOrder, "status">): boolean {
  return order.status === "PENDING" || order.status === "PAYMENT_FAILED";
}

// GET /orders/me: đơn của mình, mới nhất trước (FR-20 tiêu chí 1)
export function getMyOrders(): Promise<MyOrder[]> {
  return apiFetch<MyOrder[]>("/orders/me");
}

// GET /orders/:id: đơn người khác hoặc không có trả 404 "Không tìm thấy đơn hàng" (FR-20 tiêu chí 2)
export function getMyOrder(id: string | number): Promise<MyOrder> {
  return apiFetch<MyOrder>(`/orders/${id}`);
}

// PATCH /orders/:id/cancel (FR-17): đơn vừa đổi trạng thái trả 409
export function cancelMyOrder(id: number): Promise<MyOrder> {
  return apiFetch<MyOrder>(`/orders/${id}/cancel`, { method: "PATCH" });
}

// Thanh toán lại hoặc thanh toán tiếp: POST /payments với Idempotency-Key mới (FR-16 tiêu chí 2)
export function payOrder(
  orderId: number,
  method: PaymentMethod,
): Promise<{ txnRef: string; payUrl: string }> {
  return apiFetch<{ txnRef: string; payUrl: string }>("/payments", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ orderId, method }),
  });
}

// Chuyển sang trang thanh toán VNPay. Tách riêng để test thay bằng hàm giả.
export function openPaymentPage(payUrl: string) {
  window.location.assign(payUrl);
}

// Kết quả server xác minh từ Return URL (FR-19, BR-12)
export type PaymentResult = {
  orderId: number;
  code: string;
  status: OrderStatus;
  message: string;
};

// Gửi nguyên tham số VNPay trả về cho server xác minh, không tự tin vào đường dẫn (FR-19 tiêu chí 1)
export function verifyPayment(search: string): Promise<PaymentResult> {
  return apiFetch<PaymentResult>(`/payments/vnpay-return${search}`);
}

// Lấy số điểm mới nhất từ server (GET /auth/me) rồi lưu vào phiên,
// thanh điều hướng tự hiện số mới (FR-18 tiêu chí 3)
export async function refreshPoints(): Promise<number> {
  const me = await apiFetch<User>("/auth/me");
  const session = getSession();
  if (session) saveSession({ ...session, user: me });
  return me.loyaltyPoints;
}