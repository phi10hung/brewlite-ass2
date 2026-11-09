import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, ApiError, apiFetch } from "./api";

// Thay fetch của trình duyệt bằng hàm giả, không gọi API thật
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch (CT-04 – CT-08)", () => {
  it("gọi đúng địa chỉ API và trả dữ liệu khi thành công", async () => {
    const fetchMock = mockFetch(200, [{ id: 1, name: "Cà phê sữa" }]);
    await expect(apiFetch("/products")).resolves.toEqual([
      { id: 1, name: "Cà phê sữa" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/products`,
      expect.any(Object),
    );
  });

  it("dùng câu báo lỗi tiếng Việt của API khi lỗi 4xx", async () => {
    mockFetch(404, { statusCode: 404, message: "Không tìm thấy món" });
    await expect(apiFetch("/products/99")).rejects.toMatchObject({
      status: 404,
      message: "Không tìm thấy món",
    });
  });

  it("báo lỗi chung bằng tiếng Việt khi lỗi 5xx, không hiện lỗi gốc", async () => {
    mockFetch(500, { statusCode: 500, message: "Internal server error" });
    await expect(apiFetch("/products")).rejects.toMatchObject({
      status: 500,
      message: "Hệ thống đang bận, vui lòng thử lại sau.",
    });
  });

  it("báo mất kết nối khi không gọi được máy chủ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    const error = await apiFetch("/products").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      message: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
    });
  });

  it("gửi kèm Content-Type JSON khi có dữ liệu gửi lên", async () => {
    const fetchMock = mockFetch(201, { id: 1 });
    await apiFetch("/orders", { method: "POST", body: JSON.stringify({}) });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });
});