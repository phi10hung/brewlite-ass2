"use client";

import { useEffect } from "react";

// Đăng ký service worker public/sw.js khi trang mở trên trình duyệt (NFR-14).
// Chỉ bật ở bản build (npm run build rồi npm start, hoặc trên Vercel); khi chạy npm run dev
// thì không bật, để trình duyệt không giữ code cũ trong lúc đang sửa giao diện.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Không đăng ký được thì web vẫn chạy bình thường, chỉ không xem được khi mất mạng
    });
  }, []);

  return null;
}