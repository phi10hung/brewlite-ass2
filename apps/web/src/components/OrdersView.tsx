"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime, formatVnd } from "@/lib/format";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/order-status";
import { getMyOrders, METHOD_LABEL, type MyOrder } from "@/lib/orders";

type State =
  | { kind: "loading" }
  | { kind: "ready"; orders: MyOrder[] }
  | { kind: "error"; message: string };

// Trang lịch sử đơn /orders (FR-20 tiêu chí 1, 3): đơn mới nhất trước, nhãn trạng thái tiếng Việt,
// bấm vào một đơn để mở chi tiết; chưa có đơn thì báo trống kèm nút về Menu (NFR-12).
export default function OrdersView() {
  const [state, setState] = useState<State>({ kind: "loading" });
  // Tăng lên để tải lại (nút Thử lại)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyOrders()
      .then((orders) => {
        if (!cancelled) setState({ kind: "ready", orders });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ kind: "error", message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function reload() {
    setState({ kind: "loading" });
    setReloadKey((key) => key + 1);
  }

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
        <button
          type="button"
          onClick={reload}
          className="min-h-11 rounded-lg border border-stone-300 px-5 font-medium"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (state.orders.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-stone-600">Bạn chưa có đơn hàng nào</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
        >
          Về Menu
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {state.orders.map((order) => {
        const cups = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              aria-label={`Đơn ${order.code}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-brand"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{order.code}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {formatDateTime(order.createdAt)} ·{" "}
                {METHOD_LABEL[order.paymentMethod]} · {cups} ly
              </p>
              <p className="mt-1 truncate text-sm text-stone-600">
                {order.items.map((item) => item.productName).join(", ")}
              </p>
              <p className="mt-1 font-semibold text-brand">
                {formatVnd(order.total)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}