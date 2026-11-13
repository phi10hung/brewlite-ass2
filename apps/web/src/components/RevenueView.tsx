"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import { getRevenue, type Revenue } from "@/lib/staff";

const METHOD_LABEL = { WALLET: "Ví", CARD: "Thẻ" };

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; revenue: Revenue };

// Màn hình doanh thu (FR-23): tổng hôm nay, tổng từ trước tới nay và danh sách giao dịch.
// Số liệu do API tính theo BR-14 (chỉ giao dịch thành công của đơn không hủy, không hoàn tiền);
// web chỉ hiển thị, không tự cộng.
export default function RevenueView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRevenue()
      .then((revenue) => {
        if (!cancelled) setState({ status: "ready", revenue });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Không tải được doanh thu.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function reload() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Doanh thu</h1>
        <button
          type="button"
          onClick={reload}
          disabled={state.status === "loading"}
          className="min-h-11 rounded-lg border border-brand px-4 text-sm text-brand disabled:opacity-50"
        >
          Tải lại
        </button>
      </div>

      {state.status === "loading" && (
        <p role="status" className="py-10 text-center text-stone-500">
          Đang tải doanh thu...
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className="py-10 text-center">
          <p className="text-red-700">{state.message}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 min-h-11 rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
          >
            Thử lại
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-brand p-4 text-white">
              <dt className="text-sm opacity-80">Hôm nay</dt>
              <dd className="text-3xl font-bold">
                {formatVnd(state.revenue.todayTotal)}
              </dd>
              <dd className="text-sm opacity-80">
                {state.revenue.todayCount} giao dịch
              </dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <dt className="text-sm text-stone-500">Tổng cộng</dt>
              <dd className="text-3xl font-bold">
                {formatVnd(state.revenue.total)}
              </dd>
              <dd className="text-sm text-stone-500">
                {state.revenue.count} giao dịch
              </dd>
            </div>
          </dl>

          <h2 className="text-lg font-semibold">Giao dịch</h2>
          {state.revenue.transactions.length === 0 ? (
            <p className="py-6 text-center text-stone-500">
              Chưa có giao dịch nào
            </p>
          ) : (
            <ul className="space-y-2">
              {state.revenue.transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t.orderCode} · {t.customerName}
                    </p>
                    <p className="text-sm text-stone-500">
                      {formatDateTime(t.createdAt)} · {METHOD_LABEL[t.method]}
                      {t.transactionNo && ` · Mã VNPay ${t.transactionNo}`}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-green-700">
                    +{formatVnd(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}