"use client";

import { useSyncExternalStore } from "react";

// Phiên đăng nhập lưu ở localStorage của trình duyệt (ADR 002): JWT và thông tin tài khoản
// API trả về khi đăng ký hoặc đăng nhập (FR-08, FR-09). JWT hết hạn sau 1 ngày (NFR-04).

export type Role = "CUSTOMER" | "STAFF";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  loyaltyPoints: number;
};

export type Session = {
  accessToken: string;
  user: User;
};

const KEY = "brewlite-auth";
const listeners = new Set<() => void>();

// Nhớ chuỗi đã đọc lần trước: chuỗi không đổi thì trả lại đúng đối tượng cũ,
// để React biết phiên không thay đổi và không vẽ lại thừa
let lastRaw: string | null = null;
let lastSession: Session | null = null;

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastSession = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      lastSession = null;
    }
  }
  return lastSession;
}

function notify() {
  for (const listener of listeners) listener();
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
  notify();
}

export function clearSession() {
  localStorage.removeItem(KEY);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Đăng nhập, đăng xuất ở tab khác cũng cập nhật tab này
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Phiên hiện tại cho giao diện; ở server luôn là null (chưa đọc được localStorage)
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}

// Phiên hết hạn: API trả 401 dù đã gửi token. Xóa phiên (giữ giỏ hàng) rồi báo cho
// SessionWatcher chuyển tới trang đăng nhập (FR-09 tiêu chí 5, Sequence-01)
const expiredListeners = new Set<() => void>();

export function expireSession() {
  clearSession();
  for (const listener of expiredListeners) listener();
}

export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

// Chỉ cho quay lại trang trong BrewLite (bắt đầu bằng một dấu "/"), tránh bị dẫn sang trang lạ
export function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}