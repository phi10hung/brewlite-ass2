"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMaxQuantity } from "@/lib/checkout";
import { formatVnd } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  cartSubtotal,
  lineKey,
  useCartStore,
  type CartItem,
} from "@/store/cart-store";

// Hỏi server số ly tối đa của từng dòng (FR-05). Dòng nào hỏi lỗi thì bỏ qua,
// không chặn khách: server vẫn kiểm tra lại kho khi tạo đơn (BR-04).
async function loadLimits(items: CartItem[]) {
  const results = await Promise.all(
    items.map((line) =>
      getMaxQuantity(items, line)
        .then((max) => [lineKey(line), max] as const)
        .catch(() => null),
    ),
  );
  return Object.fromEntries(
    results.filter((result) => result !== null),
  ) as Record<string, number>;
}

// Màn giỏ hàng: từng dòng có size, topping, đơn giá, số lượng, thành tiền;
// tăng giảm số lượng (tối thiểu 1), xóa dòng, xóa toàn bộ giỏ, tạm tính (FR-04);
// cảnh báo dòng vượt số ly còn pha được, khóa nút thanh toán khi có dòng vượt (FR-05).
export default function CartView() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  // Số ly tối đa theo từng dòng (khóa = lineKey), server trả về
  const [limits, setLimits] = useState<Record<string, number>>({});

  // Gọi lại mỗi khi giỏ thay đổi (FR-05 tiêu chí 2). Kết quả của lần gọi cũ đến muộn thì bỏ.
  useEffect(() => {
    if (items.length === 0) return;
    let stale = false;
    void loadLimits(items).then((result) => {
      if (!stale) setLimits(result);
    });
    return () => {
      stale = true;
    };
  }, [items]);

  // Giỏ nằm trong localStorage, chỉ đọc được ở trình duyệt (NFR-12: trạng thái đang tải)
  if (!hydrated) {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải giỏ hàng...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-stone-600">Giỏ hàng đang trống</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
        >
          Về Menu
        </Link>
      </div>
    );
  }

  function clearAll() {
    if (window.confirm("Xóa toàn bộ giỏ hàng?")) clear();
  }

  const overLimit = items.some((item) => {
    const max = limits[lineKey(item)];
    return max !== undefined && item.quantity > max;
  });

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => {
          const key = lineKey(item);
          const label = `${item.name} size ${item.size}`;
          const max = limits[key];
          const over = max !== undefined && item.quantity > max;
          return (
            <li
              key={key}
              className={`flex gap-3 rounded-xl border bg-white p-3 ${
                over ? "border-red-600 bg-red-50" : "border-stone-200"
              }`}
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-stone-600">
                  Size {item.size}
                  {item.toppingNames.length > 0 &&
                    ` · ${item.toppingNames.join(", ")}`}
                </p>
                <p className="text-sm">{formatVnd(item.unitPrice)} / ly</p>
                {over && (
                  <p className="text-sm font-medium text-red-700">
                    Chỉ còn pha được {max} ly
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Giảm số lượng ${label}`}
                      onClick={() => setQuantity(key, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="size-11 rounded-lg border border-stone-300 text-xl disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tăng số lượng ${label}`}
                      onClick={() => setQuantity(key, item.quantity + 1)}
                      disabled={max !== undefined && item.quantity >= max}
                      className="size-11 rounded-lg border border-stone-300 text-xl disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-semibold text-brand">
                    {formatVnd(item.unitPrice * item.quantity)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Xóa ${label}`}
                  onClick={() => removeItem(key)}
                  className="mt-1 min-h-11 text-sm text-red-700 underline"
                >
                  Xóa
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="flex justify-between text-base font-semibold">
          <span>Tạm tính</span>
          <span className="text-brand">{formatVnd(cartSubtotal(items))}</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Giá chỉ để tham khảo, hệ thống tính lại khi đặt đơn.
        </p>
        {overLimit && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            Có món vượt số ly còn pha được. Hãy giảm số lượng hoặc xóa món đó
            trước khi thanh toán.
          </p>
        )}
      </div>

      {overLimit ? (
        <button
          type="button"
          disabled
          className="min-h-11 w-full rounded-lg bg-brand font-medium text-white opacity-40"
        >
          Tiến hành thanh toán
        </button>
      ) : (
        <Link
          href="/checkout"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-brand font-medium text-white hover:bg-brand-dark"
        >
          Tiến hành thanh toán
        </Link>
      )}

      <button
        type="button"
        onClick={clearAll}
        className="min-h-11 w-full rounded-lg border border-red-700 font-medium text-red-700"
      >
        Xóa toàn bộ giỏ
      </button>
    </div>
  );
}
