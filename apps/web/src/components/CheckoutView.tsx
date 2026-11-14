"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  checkPromotionCode,
  createOrder,
  createPayment,
  findPendingOrder,
  openPayUrl,
  validatePromotion,
  type PaymentMethod,
  type PendingOrder,
} from "@/lib/checkout";
import { formatVnd } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import { cartSubtotal, lineKey, useCartStore } from "@/store/cart-store";

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: "WALLET",
    label: "Ví",
    hint: "Chọn ví hoặc ứng dụng ngân hàng trên trang VNPay",
  },
  { value: "CARD", label: "Thẻ", hint: "Thẻ ATM nội địa qua VNPay" },
];

// Mã giảm giá đã được server chấp nhận (FR-07)
type AppliedPromotion = { code: string; discount: number };

// Màn Checkout (FR-06, FR-07, Sequence-01): xem lại đơn, áp mã giảm giá, chọn Ví hoặc Thẻ,
// bấm Thanh toán thì tạo đơn, tạo giao dịch rồi chuyển sang VNPay Sandbox.
export default function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const items = useCartStore((state) => state.items);

  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [codeInput, setCodeInput] = useState("");
  const [promotion, setPromotion] = useState<AppliedPromotion | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Đơn đã tạo nhưng chưa tạo được giao dịch: cho khách mở đơn để thanh toán tiếp
  const [createdOrder, setCreatedOrder] = useState<{
    id: number;
    code: string;
  } | null>(null);

  const loggedIn = session !== null;
  const empty = items.length === 0;

  // Chưa đăng nhập: sang trang đăng nhập rồi quay lại Checkout (FR-06 tiêu chí 3).
  // Giỏ trống: về trang giỏ hàng (FR-06 tiêu chí 4).
  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/login?next=%2Fcheckout");
    else if (empty) router.replace("/cart");
  }, [hydrated, loggedIn, empty, router]);

  // Nhắc đơn chờ thanh toán còn hạn (FR-06 tiêu chí 8). Lỗi thì không nhắc, không chặn đặt đơn.
  useEffect(() => {
    if (!hydrated || !loggedIn) return;
    let stale = false;
    findPendingOrder()
      .then((order) => {
        if (!stale) setPending(order);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [hydrated, loggedIn]);

  if (!hydrated || !loggedIn || empty) {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải...
      </p>
    );
  }

  const subtotal = cartSubtotal(items);
  const discount = promotion?.discount ?? 0;
  const total = subtotal - discount;

  async function applyCode() {
    const invalid = checkPromotionCode(codeInput);
    if (invalid) {
      setPromotionError(invalid);
      return;
    }
    setCheckingCode(true);
    setPromotionError(null);
    try {
      const result = await validatePromotion(codeInput.trim(), subtotal);
      setPromotion({ code: result.code, discount: result.discount });
      setCodeInput(result.code);
    } catch (err) {
      // Mã sai: báo đúng lý do server trả về, tổng tiền giữ như trước (FR-07 tiêu chí 3)
      setPromotionError((err as Error).message);
    } finally {
      setCheckingCode(false);
    }
  }

  function removeCode() {
    setPromotion(null);
    setCodeInput("");
    setPromotionError(null);
  }

  async function pay() {
    // Khóa nút, tạo Idempotency-Key cho lần bấm này (Sequence-01, FR-06 tiêu chí 7)
    setSubmitting(true);
    setError(null);
    setCreatedOrder(null);
    const key = crypto.randomUUID();

    let order;
    try {
      order = await createOrder(items, method, promotion?.code);
    } catch (err) {
      // Tạo đơn lỗi (thiếu nguyên liệu...): báo lỗi, ở lại trang, giữ giỏ (FR-06 tiêu chí 6)
      setError((err as Error).message);
      setSubmitting(false);
      return;
    }

    try {
      const payment = await createPayment(order.orderId, method, key);
      // Giữ giỏ: chỉ xóa khi server xác nhận thanh toán thành công (FR-04 tiêu chí 8)
      openPayUrl(payment.payUrl);
    } catch (err) {
      setError((err as Error).message);
      setCreatedOrder({ id: order.orderId, code: order.code });
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {pending && (
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Bạn đang có đơn {pending.code} chờ thanh toán.{" "}
          <Link
            href={`/orders/${pending.id}`}
            className="font-semibold underline"
          >
            Xem đơn {pending.code}
          </Link>
          . Đặt đơn mới sẽ hủy đơn cũ.
        </p>
      )}

      <section
        aria-labelledby="checkout-items"
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <h2 id="checkout-items" className="font-semibold">
          Đơn hàng của bạn
        </h2>
        <ul className="mt-2 divide-y divide-stone-200">
          {items.map((item) => (
            <li key={lineKey(item)} className="flex justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.quantity} × {item.name}
                </p>
                <p className="text-sm text-stone-600">
                  Size {item.size}
                  {item.toppingNames.length > 0 &&
                    ` · ${item.toppingNames.join(", ")}`}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatVnd(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="checkout-promo"
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <h2 id="checkout-promo" className="font-semibold">
          Mã giảm giá
        </h2>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            aria-label="Mã giảm giá"
            value={codeInput}
            onChange={(event) => {
              setCodeInput(event.target.value);
              setPromotionError(null);
            }}
            placeholder="Ví dụ: GIAM10"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 uppercase"
          />
          <button
            type="button"
            onClick={applyCode}
            disabled={checkingCode || submitting}
            className="min-h-11 shrink-0 rounded-lg bg-brand px-4 font-medium text-white disabled:opacity-50"
          >
            {checkingCode ? "Đang kiểm tra..." : "Áp dụng"}
          </button>
        </div>
        {promotionError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {promotionError}
          </p>
        )}
        {promotion && (
          <p className="mt-2 flex items-center justify-between gap-2 text-sm text-green-700">
            <span>
              Đã áp dụng mã {promotion.code}: giảm{" "}
              {formatVnd(promotion.discount)}
            </span>
            <button
              type="button"
              onClick={removeCode}
              disabled={submitting}
              className="min-h-11 shrink-0 text-red-700 underline"
            >
              Bỏ mã
            </button>
          </p>
        )}
      </section>

      <fieldset className="rounded-xl bg-white p-4 shadow-sm">
        <legend className="float-left font-semibold">
          Phương thức thanh toán
        </legend>
        <div className="clear-left mt-2 space-y-2">
          {METHODS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-stone-300 p-3"
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
                className="size-5"
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-sm text-stone-600">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section
        aria-label="Tổng tiền"
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <dl className="space-y-1">
          <div className="flex justify-between">
            <dt>Tạm tính</dt>
            <dd>{formatVnd(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Giảm giá</dt>
            <dd>{discount > 0 ? `−${formatVnd(discount)}` : formatVnd(0)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <dt>Tổng cộng</dt>
            <dd className="text-brand">{formatVnd(total)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-stone-500">
          Giá chỉ để tham khảo, hệ thống tính lại khi đặt đơn.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          <p>{error}</p>
          {createdOrder && (
            <p className="mt-1">
              Đơn {createdOrder.code} đã được tạo.{" "}
              <Link
                href={`/orders/${createdOrder.id}`}
                className="font-semibold underline"
              >
                Mở đơn để thanh toán tiếp
              </Link>
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={submitting}
        className="min-h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {submitting
          ? "Đang chuyển sang VNPay..."
          : `Thanh toán ${formatVnd(total)}`}
      </button>
      <p className="text-center text-xs text-stone-500">
        Bạn sẽ được chuyển sang VNPay Sandbox (môi trường thử, không trừ tiền
        thật).
      </p>
    </div>
  );
}
