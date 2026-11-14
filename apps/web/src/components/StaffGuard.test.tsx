import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, saveSession, type Role } from "@/lib/session";
import Navbar from "./Navbar";
import StaffGuard from "./StaffGuard";

// Router và đường dẫn của Next.js thay bằng hàm giả khi test
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/staff/revenue",
}));

function signIn(role: Role) {
  saveSession({
    accessToken: "token-thu",
    user: {
      id: role === "STAFF" ? 2 : 1,
      name: role === "STAFF" ? "Nhân viên quầy" : "Khách hàng mẫu",
      email: role === "STAFF" ? "staff@brewlite.vn" : "khach@brewlite.vn",
      role,
      loyaltyPoints: 0,
    },
  });
}

afterEach(() => {
  act(() => clearSession());
  replace.mockClear();
});

describe("Khung trang nhân viên (CT-59 – CT-60)", () => {
  it("CT-59: chưa đăng nhập thì chuyển tới đăng nhập kèm trang đang xem; Khách hàng thì báo không có quyền; Nhân viên thì thấy thanh chọn màn hình và nội dung", () => {
    const { rerender } = render(
      <StaffGuard>
        <p>Nội dung nhân viên</p>
      </StaffGuard>,
    );
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fstaff%2Frevenue");
    expect(screen.queryByText("Nội dung nhân viên")).toBeNull();

    act(() => signIn("CUSTOMER"));
    rerender(
      <StaffGuard>
        <p>Nội dung nhân viên</p>
      </StaffGuard>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chỉ nhân viên được truy cập",
    );
    expect(screen.queryByText("Nội dung nhân viên")).toBeNull();

    act(() => signIn("STAFF"));
    expect(screen.getByText("Nội dung nhân viên")).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Trang nhân viên" });
    expect(tabs).toHaveTextContent("Đơn hàng");
    expect(screen.getByRole("link", { name: "Kho" })).toHaveAttribute(
      "href",
      "/staff/ingredients",
    );
    // Đang ở /staff/revenue nên mục Doanh thu được đánh dấu
    expect(screen.getByRole("link", { name: "Doanh thu" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("CT-60: thanh điều hướng chỉ hiện mục Quầy với tài khoản Nhân viên", () => {
    act(() => signIn("CUSTOMER"));
    const { unmount } = render(<Navbar />);
    expect(screen.queryByRole("link", { name: "Quầy" })).toBeNull();
    unmount();

    act(() => signIn("STAFF"));
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Quầy" })).toHaveAttribute(
      "href",
      "/staff",
    );
  });
});