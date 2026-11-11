import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expireSession } from "@/lib/session";
import SessionWatcher from "./SessionWatcher";

// Thay router của Next.js bằng hàm giả để biết trang được chuyển tới đâu
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("Tự chuyển tới trang đăng nhập khi phiên hết hạn (CT-45)", () => {
  it("CT-45: phiên hết hạn thì chuyển tới /login, kèm trang đang xem để quay lại", () => {
    window.history.pushState({}, "", "/cart?buoc=1");
    render(<SessionWatcher />);

    act(() => expireSession());

    expect(push).toHaveBeenCalledWith("/login?next=%2Fcart%3Fbuoc%3D1");
    window.history.pushState({}, "", "/");
  });
});