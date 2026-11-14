"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";

// Trang chỉ dành cho người đã đăng nhập (đơn hàng của khách, FR-20).
// Chưa đăng nhập thì chuyển tới trang đăng nhập, đăng nhập xong quay lại đúng trang (FR-09 tiêu chí 5).
// API vẫn tự kiểm tra JWT và trả 401; phần này chỉ để giao diện chuyển trang sớm.
export default function LoginRequired({ children }: { children: ReactNode }) {
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
  return <>{children}</>;
}