"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import {
  getProduct,
  unitPrice,
  type ProductDetail,
  type ProductSize,
} from "@/lib/products";
import { useCartStore } from "@/store/cart-store";

// Màn hình luôn ở đúng một trạng thái: đang tải, không tìm thấy, lỗi, đã có dữ liệu (NFR-12)
type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; product: ProductDetail };

// Màn chi tiết món: gọi GET /products/:id, chọn một size, nhiều topping, số lượng;
// giá cập nhật ngay theo lựa chọn (FR-03, BR-01), thêm vào giỏ (FR-04).
// Mã món sai hoặc 404 thì báo "Không tìm thấy món".
export default function ProductDetailView({ id }: { id: number }) {
  const validId = Number.isInteger(id) && id > 0;
  const [state, setState] = useState<State>(
    validId ? { status: "loading" } : { status: "not-found" },
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    getProduct(id)
      .then((product) => {
        if (!cancelled) setState({ status: "ready", product });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Không tải được món, vui lòng thử lại.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, validId, reloadKey]);

  function retry() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  if (state.status === "loading") {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải món...
      </p>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-semibold">Không tìm thấy món</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
        >
          Về menu
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-red-700">{state.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 min-h-11 rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-dark"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // key: đổi món thì lựa chọn size, topping, số lượng bắt đầu lại từ đầu
  return <ProductOptions key={state.product.id} product={state.product} />;
}

// Phần chọn size, topping, số lượng, giá và nút thêm vào giỏ của một món đã tải xong
function ProductOptions({ product }: { product: ProductDetail }) {
  const [size, setSize] = useState<ProductSize["size"]>("S");
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  // Số ly vừa thêm vào giỏ, để hiện thông báo; null là chưa thêm
  const [added, setAdded] = useState<number | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  // stock = số ly size S, không topping, còn pha được (BR-03); 0 là "Hết món"
  const soldOut = product.stock <= 0;
  const price = unitPrice(product, size, toppingIds);

  function addToCart() {
    // Giỏ lưu tên topping để hiển thị; giá chỉ để xem, server tính lại khi tạo đơn (BR-02)
    const chosen = product.toppings.filter((topping) =>
      toppingIds.includes(topping.id),
    );
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppingIds: chosen.map((topping) => topping.id),
      toppingNames: chosen.map((topping) => topping.name),
      unitPrice: price,
      quantity,
    });
    setAdded(quantity);
  }

  function toggleTopping(toppingId: number) {
    setToppingIds((ids) =>
      ids.includes(toppingId)
        ? ids.filter((item) => item !== toppingId)
        : [...ids, toppingId],
    );
  }

  return (
    <article className="mx-auto max-w-xl space-y-5">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority
          sizes="(min-width: 640px) 576px, 100vw"
          className={`object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
        />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="mt-1 text-stone-600">{product.description}</p>
        {soldOut ? (
          <p className="mt-2 inline-block rounded-md bg-red-700 px-2 py-1 text-sm font-semibold text-white">
            Hết món
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-green-800">
            Còn {product.stock} ly
          </p>
        )}
      </div>

      <fieldset disabled={soldOut} className="space-y-2">
        <legend className="mb-2 font-semibold">Chọn size</legend>
        <div className="grid grid-cols-3 gap-2">
          {product.sizes.map((item) => (
            <label
              key={item.size}
              className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border border-stone-300 px-2 py-1 has-checked:border-brand has-checked:bg-brand has-checked:text-white has-disabled:cursor-not-allowed has-disabled:opacity-50"
            >
              <input
                type="radio"
                name="size"
                value={item.size}
                checked={size === item.size}
                onChange={() => setSize(item.size)}
                className="sr-only"
              />
              <span className="font-semibold">Size {item.size}</span>
              <span className="text-xs">
                {item.extra > 0 ? `+${formatVnd(item.extra)}` : "Giá gốc"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={soldOut}>
        <legend className="mb-2 font-semibold">Topping (chọn nhiều)</legend>
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {product.toppings.map((topping) => (
            <li key={topping.id}>
              <label
                className={`flex min-h-11 items-center gap-3 px-3 ${topping.available ? "cursor-pointer" : "text-stone-400"}`}
              >
                <input
                  type="checkbox"
                  checked={toppingIds.includes(topping.id)}
                  disabled={!topping.available}
                  onChange={() => toggleTopping(topping.id)}
                  className="size-5 accent-brand"
                />
                <span className="flex-1">
                  {topping.name}
                  {!topping.available && " (hết)"}
                </span>
                <span className="text-sm">+{formatVnd(topping.price)}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex items-center justify-between">
        <span className="font-semibold">Số lượng</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((value) => value - 1)}
            disabled={soldOut || quantity <= 1}
            className="size-11 rounded-lg border border-stone-300 text-xl disabled:opacity-40"
          >
            −
          </button>
          <span aria-live="polite" className="w-8 text-center text-lg font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((value) => value + 1)}
            disabled={soldOut || quantity >= product.stock}
            className="size-11 rounded-lg border border-stone-300 text-xl disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-1 rounded-lg bg-white p-3 text-sm shadow-sm">
        <p className="flex justify-between">
          <span>Đơn giá</span>
          <span>{formatVnd(price)}</span>
        </p>
        <p className="flex justify-between text-base font-semibold">
          <span>Thành tiền</span>
          <span className="text-brand">{formatVnd(price * quantity)}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={addToCart}
        disabled={soldOut}
        className="min-h-12 w-full rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        Thêm vào giỏ
      </button>
      {added !== null && (
        <p role="status" className="text-center text-sm text-green-800">
          Đã thêm {added} ly vào giỏ.{" "}
          <Link href="/cart" className="font-semibold underline">
            Xem giỏ hàng
          </Link>
        </p>
      )}
    </article>
  );
}