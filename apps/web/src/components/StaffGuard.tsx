"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";

// Các màn hình của Nhân viên
export const STAFF_TABS = [
  { href: "/staff", label: "Đơn hàng" },
  { href: "/staff/revenue", label: "Doanh thu" },
  { href: "/staff/ingredients", label: "Kho" },
];

// Khung chung của trang nhân viên /staff/* (FR-22 – FR-24, NFR-05):
// chưa đăng nhập thì chuyển tới trang đăng nhập, đăng nhập xong quay lại đúng trang;
// tài khoản Khách hàng thì báo không có quyền (Activity-02); Nhân viên thì thấy thanh chọn màn hình.
// API vẫn tự kiểm tra quyền và trả 403, phần này chỉ để giao diện báo sớm, rõ ràng.
export default function StaffGuard({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = hydrated && !session;

  useEffect(() => {
    if (signedOut) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [signedOut, router, pathname]);

  // Phiên lưu ở trình duyệt: chờ đọc xong mới biết đã đăng nhập hay chưa
  if (!session) {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải...
      </p>
    );
  }

  if (session.user.role !== "STAFF") {
    return (
      <p role="alert" className="py-10 text-center text-red-700">
        Chỉ nhân viên được truy cập
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Trang nhân viên">
        <ul className="flex flex-wrap gap-2">
          {STAFF_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-stone-300 bg-white hover:bg-stone-100"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}