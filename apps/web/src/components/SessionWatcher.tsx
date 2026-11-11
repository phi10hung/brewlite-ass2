"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onSessionExpired } from "@/lib/session";

// Phiên hết hạn (API trả 401) thì chuyển tới trang đăng nhập, kèm trang đang xem để
// đăng nhập xong quay lại đúng chỗ (FR-09 tiêu chí 5). Giỏ hàng giữ nguyên (Sequence-01).
export default function SessionWatcher() {
  const router = useRouter();

  useEffect(
    () =>
      onSessionExpired(() => {
        const next = window.location.pathname + window.location.search;
        router.push(`/login?next=${encodeURIComponent(next)}`);
      }),
    [router],
  );

  return null;
}