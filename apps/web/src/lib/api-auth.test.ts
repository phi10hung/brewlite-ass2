import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import { getSession, onSessionExpired, saveSession } from "./session";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function login() {
  saveSession({
    accessToken: "token-thu",
    user: {
      id: 1,
      name: "Khách hàng mẫu",
      email: "khach@brewlite.vn",
      role: "CUSTOMER",
      loyaltyPoints: 0,
    },
  });
}

// Ghi lại mỗi lần báo "phiên hết hạn" (SessionWatcher nghe tín hiệu này để chuyển trang)
const expired = vi.fn();
let stopListening: () => void;

beforeEach(() => {
  localStorage.clear();
  expired.mockClear();
  stopListening = onSessionExpired(expired);
});

afterEach(() => {
  stopListening();
  vi.unstubAllGlobals();
});

describe("apiFetch gửi JWT và xử lý 401 (CT-43 – CT-44)", () => {
  it("CT-43: đã đăng nhập thì gửi header Authorization: Bearer <token>; chưa đăng nhập thì không gửi", async () => {
    const fetchMock = mockFetch(200, {});
    await apiFetch("/auth/me");
    expect(
      new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).has(
        "Authorization",
      ),
    ).toBe(false);

    login();
    await apiFetch("/auth/me");
    expect(
      new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers).get(
        "Authorization",
      ),
    ).toBe("Bearer token-thu");
  });

  it("CT-44: đã gửi token mà API trả 401 thì tự đăng xuất và báo phiên hết hạn", async () => {
    login();
    mockFetch(401, { message: "Phiên đăng nhập đã hết hạn" });

    await expect(apiFetch("/auth/me")).rejects.toMatchObject({
      status: 401,
      message: "Phiên đăng nhập đã hết hạn",
    });
    expect(getSession()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("sai mật khẩu khi đăng nhập (chưa có token) chỉ báo lỗi, không báo phiên hết hạn", async () => {
    mockFetch(401, { message: "Email hoặc mật khẩu không đúng" });

    await expect(apiFetch("/auth/login", { method: "POST" })).rejects.toMatchObject(
      { status: 401, message: "Email hoặc mật khẩu không đúng" },
    );
    expect(expired).not.toHaveBeenCalled();
  });
});