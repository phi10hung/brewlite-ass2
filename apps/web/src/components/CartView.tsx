"use client";

import Image from "next/image";
import Link from "next/link";
import { formatVnd } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { cartSubtotal, lineKey, useCartStore } from "@/store/cart-store";

// Màn giỏ hàng: từng dòng có size, topping, đơn giá, số lượng, thành tiền;
// tăng giảm số lượng (tối thiểu 1), xóa dòng, xóa toàn bộ giỏ, tạm tính (FR-04).
export default function CartView() {
  const hydrated = useHydrated();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

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

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => {
          const key = lineKey(item);
          const label = `${item.name} size ${item.size}`;
          return (
            <li
              key={key}
              className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3"
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
                      className="size-11 rounded-lg border border-stone-300 text-xl"
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
      </div>

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