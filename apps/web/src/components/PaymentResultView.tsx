"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { refreshPoints, verifyPayment, type PaymentResult } from "@/lib/orders";
import { useCartStore } from "@/store/cart-store";

// Sau khi thanh toán thành công, chờ chừng này rồi tự mở trang chi tiết đơn (FR-19 tiêu chí 2)
export const REDIRECT_MS = 3000;

type State =
  | { kind: "loading" }
  | { kind: "done"; result: PaymentResult }
  | { kind: "error"; message: string };

const LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark";

// Trang kết quả thanh toán /payment/result (FR-19, FR-16, Sequence-01 bước 14 – 21).
// VNPay chuyển khách về đây kèm tham số có chữ ký; web gửi nguyên tham số cho server xác minh.
export default function PaymentResultView() {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clear);
  const [state, setState] = useState<State>({ kind: "loading" });
  // Chỉ gửi xác minh một lần, kể cả khi React chạy effect hai lần lúc lập trình
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const search = window.location.search;
    const check = search.includes("vnp_")
      ? verifyPayment(search)
      : Promise.reject(new Error("Không có kết quả thanh toán để kiểm tra"));
    check
      .then((result) => {
        setState({ kind: "done", result });
        if (result.status === "PAID") {
          // Server đã xác nhận: xóa giỏ, cập nhật điểm (FR-04 tiêu chí 8, FR-19 tiêu chí 2)
          clearCart();
          refreshPoints().catch(() => {});
        }
      })
      .catch((err) =>
        setState({ kind: "error", message: (err as Error).message }),
      );
  }, [clearCart]);

  // Thành công: 3 giây sau mở chi tiết đơn
  const paidOrderId =
    state.kind === "done" && state.result.status === "PAID"
      ? state.result.orderId
      : null;
  useEffect(() => {
    if (paidOrderId === null) return;
    const timer = setTimeout(
      () => router.replace(`/orders/${paidOrderId}`),
      REDIRECT_MS,
    );
    return () => clearTimeout(timer);
  }, [paidOrderId, router]);

  if (state.kind === "loading") {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang kiểm tra kết quả thanh toán...
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-4 py-6 text-center">
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
        <Link href="/orders" className={LINK_CLASS}>
          Xem đơn hàng của tôi
        </Link>
      </div>
    );
  }

  const { result } = state;
  const orderLink = `/orders/${result.orderId}`;

  if (result.status === "PAID") {
    return (
      <div className="space-y-3 py-6 text-center">
        <p role="status" className="text-xl font-semibold text-green-700">
          Thanh toán thành công
        </p>
        <p>
          Mã đơn của bạn: <strong>{result.code}</strong>
        </p>
        <p className="text-sm text-stone-500">
          Đang chuyển tới chi tiết đơn...
        </p>
        <Link href={orderLink} className={LINK_CLASS}>
          Xem đơn ngay
        </Link>
      </div>
    );
  }

  if (result.status === "PAYMENT_FAILED") {
    return (
      <div className="space-y-3 py-6 text-center">
        <p role="alert" className="text-xl font-semibold text-red-700">
          Thanh toán không thành công
        </p>
        <p>{result.message}</p>
        <p className="text-sm text-stone-500">
          Giỏ hàng của bạn vẫn được giữ. Đơn {result.code} còn hạn thì có thể
          thanh toán lại.
        </p>
        <Link href={orderLink} className={LINK_CLASS}>
          Mở đơn để thanh toán lại
        </Link>
      </div>
    );
  }

  // Chưa xác minh được (PENDING): không kết luận thất bại (FR-16 tiêu chí 4).
  // Trạng thái khác (ví dụ đơn đã hủy): hiện câu server trả về.
  return (
    <div className="space-y-3 py-6 text-center">
      <p role="status" className="text-xl font-semibold text-amber-700">
        {result.status === "PENDING"
          ? "Đang kiểm tra thanh toán"
          : result.message}
      </p>
      <p className="text-sm text-stone-500">
        Hệ thống đang xác nhận với VNPay cho đơn {result.code}. Bạn mở đơn sau
        ít phút để xem kết quả, không cần thanh toán lại.
      </p>
      <Link href={orderLink} className={LINK_CLASS}>
        Xem đơn {result.code}
      </Link>
    </div>
  );
}