import Link from "next/link";

// Các mục trên thanh điều hướng. Sprint 2 thêm mục mới vào mảng này
// (ví dụ Giỏ hàng, Đơn của tôi, Đăng nhập), không cần sửa phần giao diện bên dưới.
export const NAV_LINKS = [{ href: "/", label: "Menu" }];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4"
      >
        <Link href="/" className="text-lg font-bold text-brand">
          BrewLite
        </Link>
        <ul className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              {/* min-h-11 = 44 px: đủ lớn để bấm bằng ngón tay (NFR-10) */}
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-stone-100"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}