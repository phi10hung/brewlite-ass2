// Trạng thái đơn hàng, dùng chung cho trang nhân viên và trang đơn của khách.
// Tên tiếng Việt trùng với API (apps/api/src/orders/order-status.ts) để giao diện và câu báo lỗi khớp nhau.

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_FAILED"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type RefundStatus = "PENDING" | "SUCCESS" | "FAILED";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAYMENT_FAILED: "Thanh toán thất bại",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Chờ lấy đồ",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

// Màu nhãn trạng thái
export const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  PAID: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  READY: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-stone-200 text-stone-700",
};

// Bước tiếp theo nhân viên bấm ở quầy: Nhận đơn → Pha xong → Giao khách (FR-22, BR-10, Activity-02)
export const NEXT_STEP: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  PAID: { status: "PREPARING", label: "Nhận đơn" },
  PREPARING: { status: "READY", label: "Pha xong" },
  READY: { status: "COMPLETED", label: "Giao khách" },
};

// Tình trạng hoàn tiền của đơn đã hủy sau khi thanh toán (FR-17 tiêu chí 3).
// Lần gửi trước lỗi (FAILED) vẫn là "Đang hoàn tiền" vì hệ thống tự thử lại mỗi 60 giây.
export function refundLabel(
  status: RefundStatus | null | undefined,
): string | null {
  if (status === "SUCCESS") return "Đã hoàn tiền";
  if (status === "PENDING" || status === "FAILED") return "Đang hoàn tiền";
  return null;
}