import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import RegisterForm from "./RegisterForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const SESSION = {
  accessToken: "token-thu",
  user: {
    id: 3,
    name: "Bạn Mới",
    email: "banmoi@gmail.com",
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

async function fillAndSubmit(name: string, email: string, password: string) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText("Họ tên"), name);
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password)
    await user.type(screen.getByLabelText(/^Mật khẩu/), password);
  await user.click(screen.getByRole("button", { name: "Đăng ký" }));
}

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn đăng ký (CT-49 – CT-51)", () => {
  it("CT-49: họ tên trống, email sai, mật khẩu dưới 6 ký tự thì báo đúng 3 lỗi, không gọi API", async () => {
    const fetchMock = mockFetch(201, SESSION);
    render(<RegisterForm />);

    await fillAndSubmit("", "khong-phai-email", "123");

    expect(screen.getByText("Vui lòng nhập họ tên")).toBeInTheDocument();
    expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    expect(screen.getByText("Mật khẩu tối thiểu 6 ký tự")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CT-50: hợp lệ thì gọi POST /auth/register, được đăng nhập luôn và về trang chủ", async () => {
    const fetchMock = mockFetch(201, SESSION);
    render(<RegisterForm />);

    await fillAndSubmit("Bạn Mới", "banmoi@gmail.com", "123456");

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/register$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "Bạn Mới",
      email: "banmoi@gmail.com",
      password: "123456",
    });
    expect(getSession()).toEqual(SESSION);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it('CT-51: email đã đăng ký thì hiện "Email đã được đăng ký"', async () => {
    mockFetch(409, { message: "Email đã được đăng ký" });
    render(<RegisterForm />);

    await fillAndSubmit("Khách", "khach@brewlite.vn", "123456");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email đã được đăng ký",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});