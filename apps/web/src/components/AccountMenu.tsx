"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, useSession } from "@/lib/session";
import { useCartStore } from "@/store/cart-store";

const ITEM_CLASS =
  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-stone-100";

// Chưa đăng nhập: nút Đăng nhập. Đã đăng nhập: tên người dùng (màn hình rộng) và nút Đăng xuất.
// Đăng xuất xóa token và giỏ hàng (FR-09 tiêu chí 7, FR-04 tiêu chí 8).
export default function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clear);

  if (!session) {
    return (
      <Link href="/login" className={ITEM_CLASS}>
        Đăng nhập
      </Link>
    );
  }

  function logout() {
    clearSession();
    clearCart();
    router.push("/");
  }

  return (
    <div className="flex items-center">
      <span className="hidden px-2 text-sm text-stone-600 sm:inline">
        {session.user.name}
      </span>
      <button type="button" onClick={logout} className={ITEM_CLASS}>
        Đăng xuất
      </button>
    </div>
  );
}