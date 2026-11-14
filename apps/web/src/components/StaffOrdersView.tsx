"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  NEXT_STEP,
  refundLabel,
  STATUS_CLASS,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/order-status";
import {
  getStaffOrders,
  updateOrderStatus,
  type StaffOrder,
} from "@/lib/staff";

// Bộ lọc của màn hình quầy; mặc định là đơn đã thanh toán, đang chờ nhận (Activity-02)
const FILTERS: { value: OrderStatus | ""; label: string }[] = [
  { value: "PAID", label: STATUS_LABEL.PAID },
  { value: "PREPARING", label: STATUS_LABEL.PREPARING },
  { value: "READY", label: STATUS_LABEL.READY },
  { value: "COMPLETED", label: STATUS_LABEL.COMPLETED },
  { value: "CANCELLED", label: STATUS_LABEL.CANCELLED },
  { value: "", label: "Tất cả" },
];

const METHOD_LABEL = { WALLET: "Ví", CARD: "Thẻ" };

type State =
  | { status: "loading" }
  | { status: "error"; message: string; canRetry: boolean }
  | { status: "ready"; orders: StaffOrder[] };

// Thông báo sau khi bấm nút: thành công (xanh) hoặc lỗi (đỏ)
type Notice = { type: "ok" | "error"; text: string };

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

// Màn hình quầy (FR-22, Activity-02): lọc đơn theo trạng thái, bấm Nhận đơn → Pha xong → Giao khách,
// hủy đơn đã thanh toán. Đơn vừa bị người khác đổi (409) thì báo lỗi và tải lại danh sách.
// Đủ trạng thái đang tải, trống, lỗi (NFR-12).
export default function StaffOrdersView() {
  const [filter, setFilter] = useState<OrderStatus | "">("PAID");
  const [state, setState] = useState<State>({ status: "loading" });
  // Tăng số này để tải lại danh sách
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStaffOrders(filter || undefined)
      .then((orders) => {
        if (!cancelled) setState({ status: "ready", orders });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: errorText(error, "Không tải được danh sách đơn."),
          // Không có quyền (403) thì thử lại cũng vậy
          canRetry: !(error instanceof ApiError && error.status === 403),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  function changeFilter(value: OrderStatus | "") {
    setState({ status: "loading" });
    setNotice(null);
    setFilter(value);
  }

  function retry() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  async function changeStatus(order: StaffOrder, status: OrderStatus) {
    setBusyId(order.id);
    setNotice(null);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setNotice({
        type: "ok",
        text: `Đơn ${updated.code}: ${STATUS_LABEL[updated.status]}`,
      });
    } catch (error) {
      // Ví dụ 409 "Đơn vừa đổi trạng thái, vui lòng tải lại"
      setNotice({
        type: "error",
        text: errorText(error, "Không đổi được trạng thái đơn."),
      });
    } finally {
      setBusyId(null);
      // Thành công hay lỗi đều tải lại để thấy đúng trạng thái mới nhất
      setReloadKey((key) => key + 1);
    }
  }

  function cancelOrder(order: StaffOrder) {
    const ok = window.confirm(
      `Hủy đơn ${order.code}? Nguyên liệu được trả lại kho và khách được hoàn tiền.`,
    );
    if (ok) void changeStatus(order, "CANCELLED");
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Đơn hàng tại quầy</h1>

      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value || "ALL"}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => changeFilter(item.value)}
            className={`min-h-11 rounded-full border px-4 text-sm ${
              filter === item.value
                ? "border-brand bg-brand text-white"
                : "border-stone-300 bg-white hover:bg-stone-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={notice.type === "error" ? "text-red-700" : "text-green-700"}
        >
          {notice.text}
        </p>
      )}

      {state.status === "loading" && (
        <p role="status" className="py-10 text-center text-stone-500">
          Đang tải đơn hàng...
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className="py-10 text-center">
          <p className="text-red-700">{state.message}</p>
          {state.canRetry && (
            <button
              type="button"
              onClick={retry}
              className="mt-4 min-h-11 rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {state.status === "ready" && state.orders.length === 0 && (
        <p className="py-10 text-center text-stone-500">Không có đơn nào</p>
      )}

      {state.status === "ready" && state.orders.length > 0 && (
        <ul className="space-y-3">
          {state.orders.map((order) => {
            const next = NEXT_STEP[order.status];
            const busy = busyId === order.id;
            const refund =
              order.status === "CANCELLED" ? refundLabel(order.refundStatus) : null;
            return (
              <li
                key={order.id}
                aria-label={`Đơn ${order.code}`}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{order.code}</span>
                    <span className="ml-2 text-sm text-stone-500">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${STATUS_CLASS[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  Khách: {order.customerName}
                </p>
                <ul className="mt-2 text-sm">
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity} × {item.productName} ({item.size})
                      {item.toppings.length > 0 &&
                        ` + ${item.toppings.join(", ")}`}
                    </li>
                  ))}
                </ul>
                {refund && (
                  <p className="mt-2 text-sm text-stone-600">{refund}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-brand">
                    {formatVnd(order.total)}
                    <span className="ml-2 text-sm font-normal text-stone-500">
                      {METHOD_LABEL[order.paymentMethod]}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    {/* Nhân viên chỉ hủy được đơn đã thanh toán (BR-10) */}
                    {order.status === "PAID" && (
                      <button
                        type="button"
                        onClick={() => cancelOrder(order)}
                        disabled={busy}
                        className="min-h-11 rounded-lg border border-red-600 px-4 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Hủy đơn
                      </button>
                    )}
                    {next && (
                      <button
                        type="button"
                        onClick={() => void changeStatus(order, next.status)}
                        disabled={busy}
                        className="min-h-11 rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        {busy ? "Đang xử lý..." : next.label}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}