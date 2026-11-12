"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/use-hydrated";
import { cartCount, useCartStore } from "@/store/cart-store";

// Mục "Giỏ hàng" trên thanh điều hướng kèm số ly trong giỏ, cập nhật ngay khi giỏ thay đổi (FR-04 tiêu chí 5)
export default function CartLink() {
  const count = useCartStore((state) => cartCount(state.items));
  const shown = useHydrated() ? count : 0;

  return (
    <Link
      href="/cart"
      aria-label={`Giỏ hàng, ${shown} ly`}
      className="flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-stone-100"
    >
      Giỏ hàng
      {shown > 0 && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
          {shown}
        </span>
      )}
    </Link>
  );
}