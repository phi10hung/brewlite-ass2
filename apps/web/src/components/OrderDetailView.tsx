"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime, formatVnd } from "@/lib/format";
import { refundLabel, STATUS_CLASS, STATUS_LABEL } from "@/lib/order-status";
import {
  cancelMyOrder,
  getMyOrder,
  isWaiting,
  METHOD_LABEL,
  openPaymentPage,
  payOrder,
  refreshPoints,
  type MyOrder,
} from "@/lib/orders";

type State =
  | { kind: "loading" }
  | { kind: "ready"; order: MyOrder }
  | { kind: "error"; message: string };

// Số giây còn lại → "04:59"
function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Trang chi tiết đơn /orders/:id, cũng là trang xác nhận đơn (FR-19 tiêu chí 4, FR-20 tiêu chí 4, 5):
// mã đơn, trạng thái, từng món, giảm giá, tổng tiền, tình trạng hoàn tiền;
// đơn chờ thanh toán có đồng hồ đếm ngược, nút thanh toán tiếp và hủy đơn (FR-16, FR-17).
export default function OrderDetailView({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tăng lên để tải lại đơn (hết giờ, hủy đơn bị từ chối)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyOrder(id)
      .then((order) => {
        if (!cancelled) setState({ kind: "ready", order });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ kind: "error", message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const order = state.kind === "ready" ? state.order : null;
  const deadline = order ? new Date(order.expiresAt).getTime() : 0;
  const counting = order !== null && isWaiting(order) && deadline > now;

  // Đồng hồ đếm ngược: mỗi giây cập nhật; về 0 thì tải lại đơn để thấy trạng thái mới (FR-20 tiêu chí 5)
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) setReloadKey((key) => key + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [counting, deadline]);

  if (state.kind === "loading") {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải đơn hàng...
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3 py-6 text-center">
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
        <Link
          href="/orders"
          className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-5 font-medium"
        >
          Về đơn hàng của tôi
        </Link>
      </div>
    );
  }

  const current = state.order;
  const refund =
    current.status === "CANCELLED" ? refundLabel(current.refundStatus) : null;
  const canCancel = isWaiting(current) || current.status === "PAID";

  // Thanh toán tiếp: giao dịch mới cho chính đơn này, không gia hạn (FR-16 tiêu chí 2, 3)
  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const payment = await payOrder(current.id, current.paymentMethod);
      openPaymentPage(payment.payUrl);
    } catch (err) {
      // Ví dụ 400 "Đơn đã hết thời gian thanh toán", 409 "Đang kiểm tra giao dịch trước…"
      setError((err as Error).message);
      setBusy(false);
    }
  }

  // Hủy đơn (FR-17): đơn đã thanh toán thì được hoàn tiền và trừ lại điểm
  async function cancel() {
    const wasPaid = current.status === "PAID";
    const ok = window.confirm(
      wasPaid
        ? `Hủy đơn ${current.code}? Bạn sẽ được hoàn tiền qua VNPay và bị trừ lại điểm thưởng của đơn này.`
        : `Hủy đơn ${current.code}?`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await cancelMyOrder(current.id);
      setState({ kind: "ready", order: updated });
      setNotice(`Đã hủy đơn ${updated.code}`);
      if (wasPaid) refreshPoints().catch(() => {});
    } catch (err) {
      // Ví dụ 409 "Đơn đã thay đổi trạng thái, vui lòng tải lại": tải lại để thấy trạng thái mới
      setError((err as Error).message);
      setReloadKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Đơn {current.code}</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[current.status]}`}
          >
            {STATUS_LABEL[current.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {formatDateTime(current.createdAt)} ·{" "}
          {METHOD_LABEL[current.paymentMethod]}
        </p>
        {refund && (
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            {refund}
          </p>
        )}
      </div>

      <section
        aria-label="Các món"
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <ul className="divide-y divide-stone-200">
          {current.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.quantity} × {item.productName}
                </p>
                <p className="text-sm text-stone-600">
                  Size {item.size}
                  {item.toppings.length > 0 && ` · ${item.toppings.join(", ")}`}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatVnd(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3">
          <div className="flex justify-between">
            <dt>Tạm tính</dt>
            <dd>{formatVnd(current.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              Giảm giá{current.promotionCode && ` (${current.promotionCode})`}
            </dt>
            <dd>
              {current.discount > 0
                ? `−${formatVnd(current.discount)}`
                : formatVnd(0)}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Tổng cộng</dt>
            <dd className="text-brand">{formatVnd(current.total)}</dd>
          </div>
        </dl>
      </section>

      {isWaiting(current) &&
        (counting ? (
          <p role="timer" className="text-center font-medium text-amber-800">
            Còn {mmss(Math.ceil((deadline - now) / 1000))} để thanh toán
          </p>
        ) : (
          <p className="text-center text-sm text-stone-600">
            Đơn đã hết thời gian thanh toán, hệ thống sẽ tự hủy và trả nguyên
            liệu.
          </p>
        ))}

      {notice && (
        <p role="status" className="text-center text-green-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-red-700">
          {error}
        </p>
      )}

      {counting && (
        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Đang chuyển sang VNPay..." : "Thanh toán tiếp"}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="min-h-11 w-full rounded-lg border border-red-700 font-medium text-red-700 disabled:opacity-50"
        >
          Hủy đơn
        </button>
      )}
      <Link
        href="/orders"
        className="flex min-h-11 items-center justify-center text-sm text-brand underline"
      >
        Về đơn hàng của tôi
      </Link>
    </div>
  );
}