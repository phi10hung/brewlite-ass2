import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

// Thay router của Next.js bằng hàm giả để biết trang được chuyển tới đâu
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const SESSION = {
  accessToken: "token-thu",
  user: {
    id: 1,
    name: "Khách hàng mẫu",
    email: "khach@brewlite.vn",
    role: "CUSTOMER",
    loyaltyPoints: 0,
  },
};

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

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn đăng nhập (CT-46 – CT-48)", () => {
  it("CT-46: bỏ trống hoặc email sai thì báo lỗi tiếng Việt, không gọi API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(200, SESSION);
    render(<LoginForm next="/" />);

    await user.type(screen.getByLabelText("Email"), "khach@");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CT-47: đúng email, mật khẩu thì gọi POST /auth/login, lưu phiên, quay lại trang trước đó", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(200, SESSION);
    render(<LoginForm next="/cart" />);

    await user.type(screen.getByLabelText("Email"), "khach@brewlite.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "123456");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/login$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "khach@brewlite.vn",
      password: "123456",
    });
    expect(getSession()).toEqual(SESSION);
    expect(replace).toHaveBeenCalledWith("/cart");
  });

  it('CT-48: sai mật khẩu thì hiện "Email hoặc mật khẩu không đúng", ở lại trang', async () => {
    const user = userEvent.setup();
    mockFetch(401, { message: "Email hoặc mật khẩu không đúng" });
    render(<LoginForm next="/" />);

    await user.type(screen.getByLabelText("Email"), "khach@brewlite.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "sai-mat-khau");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email hoặc mật khẩu không đúng",
    );
    expect(getSession()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
  });
});