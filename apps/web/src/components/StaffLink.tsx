"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";

// Mục "Quầy" trên thanh điều hướng, chỉ hiện với tài khoản Nhân viên.
// Ở server và lúc chưa đọc phiên thì không hiện gì.
export default function StaffLink() {
  const session = useSession();
  if (session?.user.role !== "STAFF") return null;

  return (
    <li>
      <Link
        href="/staff"
        className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-stone-100"
      >
        Quầy
      </Link>
    </li>
  );
}