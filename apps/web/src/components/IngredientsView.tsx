"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  getIngredients,
  restockIngredient,
  validateRestock,
  type Ingredient,
} from "@/lib/staff";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Ingredient[] };

// Thông báo riêng của từng dòng sau khi bấm Nhập kho
type RowMessage = { type: "ok" | "error"; text: string };

// Màn hình kho nguyên liệu (FR-24): tồn kho từng nguyên liệu, nhãn "Sắp hết",
// nhập thêm số lượng. Số lượng sai thì báo ngay, không gọi API (NFR-06).
export default function IngredientsView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  // Số lượng đang gõ ở từng dòng: id nguyên liệu → chuỗi
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Record<number, RowMessage>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIngredients()
      .then((items) => {
        if (!cancelled) setState({ status: "ready", items });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Không tải được kho nguyên liệu.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function reload() {
    setState({ status: "loading" });
    setMessages({});
    setReloadKey((key) => key + 1);
  }

  function setMessage(id: number, message: RowMessage | null) {
    setMessages((prev) => {
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  function changeAmount(id: number, value: string) {
    setAmounts((prev) => ({ ...prev, [id]: value }));
    setMessage(id, null);
  }

  async function restock(item: Ingredient) {
    const value = amounts[item.id] ?? "";
    const invalid = validateRestock(value);
    if (invalid) {
      setMessage(item.id, { type: "error", text: invalid });
      return;
    }

    const amount = Number(value.trim());
    setBusyId(item.id);
    try {
      const updated = await restockIngredient(item.id, amount);
      // Cập nhật đúng dòng vừa nhập bằng số liệu API trả về
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              items: prev.items.map((i) => (i.id === updated.id ? updated : i)),
            }
          : prev,
      );
      setAmounts((prev) => ({ ...prev, [item.id]: "" }));
      setMessage(item.id, {
        type: "ok",
        text: `Đã nhập ${amount.toLocaleString("vi-VN")} ${item.unit}`,
      });
    } catch (error) {
      setMessage(item.id, {
        type: "error",
        text:
          error instanceof ApiError ? error.message : "Không nhập được kho.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Kho nguyên liệu</h1>
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
          Đang tải kho nguyên liệu...
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

      {state.status === "ready" && state.items.length === 0 && (
        <p className="py-10 text-center text-stone-500">
          Chưa có nguyên liệu nào
        </p>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <ul className="space-y-2">
          {state.items.map((item) => {
            const message = messages[item.id];
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                aria-label={item.name}
                className={`rounded-xl border p-3 ${
                  item.lowStock
                    ? "border-red-200 bg-red-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{item.name}</span>
                    {item.lowStock && (
                      <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                        Sắp hết
                      </span>
                    )}
                  </p>
                  <p className="text-sm">
                    Còn{" "}
                    <span className="font-semibold">
                      {item.stock.toLocaleString("vi-VN")}
                    </span>{" "}
                    {item.unit}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Số lượng nhập ${item.name}`}
                    placeholder={`Số ${item.unit}`}
                    value={amounts[item.id] ?? ""}
                    onChange={(event) =>
                      changeAmount(item.id, event.target.value)
                    }
                    className="min-h-11 w-28 rounded-lg border border-stone-300 px-3"
                  />
                  <button
                    type="button"
                    onClick={() => void restock(item)}
                    disabled={busy}
                    className="min-h-11 rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {busy ? "Đang nhập..." : "Nhập kho"}
                  </button>
                </div>
                {message && (
                  <p
                    role={message.type === "error" ? "alert" : "status"}
                    className={`mt-1 text-sm ${
                      message.type === "ok" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {message.text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}