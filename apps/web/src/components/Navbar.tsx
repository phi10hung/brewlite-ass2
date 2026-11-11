import Link from "next/link";
import CartLink from "@/components/CartLink";

// Các mục trên thanh điều hướng chỉ gồm đường dẫn và tên thì thêm vào mảng này.
// Mục có dữ liệu riêng (Giỏ hàng kèm số ly) là component riêng, đặt sau các mục này.
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
          <li>
            <CartLink />
          </li>
        </ul>
      </nav>
    </header>
  );
}