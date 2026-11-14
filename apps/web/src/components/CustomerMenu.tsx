"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { refreshPoints } from "@/lib/orders";
import { useSession } from "@/lib/session";

// Mục "Đơn hàng" kèm số điểm thưởng trên thanh điều hướng, chỉ hiện với tài khoản Khách hàng (FR-18, FR-20).
// Mỗi lần tải trang thì lấy điểm mới nhất từ server; thanh toán thành công, hủy đơn cũng cập nhật lại
// qua refreshPoints. Lỗi thì báo "Không tải được điểm thưởng", không hiện số 0 (FR-18 tiêu chí 3).
export default function CustomerMenu() {
  const session = useSession();
  const token = session?.user.role === "CUSTOMER" ? session.accessToken : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    refreshPoints()
      .then(() => setFailed(false))
      .catch(() => setFailed(true));
  }, [token]);

  if (!token || !session) return null;

  return (
    <li>
      <Link
        href="/orders"
        className="flex min-h-11 flex-col justify-center rounded-md px-2 text-sm font-medium leading-tight hover:bg-stone-100"
      >
        <span>Đơn hàng</span>
        {failed ? (
          <span className="text-xs font-normal text-red-700">
            Không tải được điểm thưởng
          </span>
        ) : (
          <span className="text-xs font-normal text-brand">
            {session.user.loyaltyPoints} điểm
          </span>
        )}
      </Link>
    </li>
  );
}