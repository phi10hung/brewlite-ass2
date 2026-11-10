"use client";

import { useSyncExternalStore } from "react";

// Theo dõi trạng thái mạng của trình duyệt qua sự kiện online/offline
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Thông báo khi mất mạng: dữ liệu đang xem là bản đã lưu lần trước (NFR-14)
export default function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // Lúc render sẵn trên server chưa biết trạng thái mạng: coi như có mạng
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900"
    >
      Bạn đang ngoại tuyến. Menu hiển thị là bản đã lưu lần trước.
    </div>
  );
}