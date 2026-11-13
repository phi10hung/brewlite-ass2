import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSession } from "@/lib/session";
import LoginRequired from "./LoginRequired";
import Navbar from "./Navbar";

// Thay router của Next.js bằng hàm giả để biết trang được chuyển tới đâu
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/orders/15",
}));

const CUSTOMER = {
  accessToken: "token-khach",
  user: {
    id: 1,
    name: "Khách hàng mẫu",
    email: "khach@brewlite.vn",
    role: "CUSTOMER" as const,
    loyaltyPoints: 3,
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Điểm thưởng trên thanh điều hướng, trang cần đăng nhập (CT-82 – CT-83)", () => {
  it("CT-82: khách đăng nhập thấy mục Đơn hàng kèm số điểm lấy mới từ server, đổi ngay khi điểm cập nhật; tải điểm lỗi thì báo, không hiện số 0; nhân viên không có mục này", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ ...CUSTOMER.user, loyaltyPoints: 25 }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("brewlite-auth", JSON.stringify(CUSTOMER));
    const { unmount } = render(<Navbar />);

    const link = screen.getByRole("link", { name: /Đơn hàng/ });
    expect(link).toHaveAttribute("href", "/orders");
    // Số trong phiên (3) được thay bằng số mới nhất từ GET /auth/me (25)
    expect(await screen.findByText("25 điểm")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/me$/);
    // Trang khác cập nhật điểm (ví dụ sau thanh toán) thì thanh điều hướng đổi theo
    act(() =>
      saveSession({
        ...CUSTOMER,
        user: { ...CUSTOMER.user, loyaltyPoints: 35 },
      }),
    );
    expect(screen.getByText("35 điểm")).toBeInTheDocument();
    unmount();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json({ statusCode: 500, message: "Internal server error" }, 500),
        ),
    );
    const failed = render(<Navbar />);
    expect(
      await screen.findByText("Không tải được điểm thưởng"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+ điểm/)).toBeNull();
    failed.unmount();

    localStorage.setItem(
      "brewlite-auth",
      JSON.stringify({
        ...CUSTOMER,
        user: { ...CUSTOMER.user, role: "STAFF" },
      }),
    );
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /Đơn hàng/ })).toBeNull();
  });

  it("CT-83: trang đơn hàng khi chưa đăng nhập thì chuyển tới đăng nhập rồi quay lại đúng trang; đã đăng nhập thì hiện nội dung", () => {
    const { unmount } = render(
      <LoginRequired>
        <p>Nội dung đơn</p>
      </LoginRequired>,
    );
    expect(replace).toHaveBeenCalledWith("/login?next=%2Forders%2F15");
    expect(screen.queryByText("Nội dung đơn")).toBeNull();
    unmount();

    replace.mockClear();
    localStorage.setItem("brewlite-auth", JSON.stringify(CUSTOMER));
    render(
      <LoginRequired>
        <p>Nội dung đơn</p>
      </LoginRequired>,
    );
    expect(screen.getByText("Nội dung đơn")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});