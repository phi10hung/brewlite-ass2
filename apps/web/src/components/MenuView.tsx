"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CategoryFilter, { ALL } from "@/components/CategoryFilter";
import ProductCard from "@/components/ProductCard";
import { ApiError } from "@/lib/api";
import { getProducts, type Product } from "@/lib/products";

// Màn hình luôn ở đúng một trong ba trạng thái: đang tải, lỗi, đã có dữ liệu (NFR-12)
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: Product[] };

// Gom món theo danh mục, giữ thứ tự danh mục như dữ liệu API trả về
function groupByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    groups.set(product.category, [
      ...(groups.get(product.category) ?? []),
      product,
    ]);
  }
  return groups;
}

// Màn Menu: gọi GET /products, hiện món theo danh mục, lọc theo danh mục (FR-01),
// nhãn "Hết món" (FR-02), đủ trạng thái đang tải, trống, lỗi kèm nút Thử lại (NFR-12).
export default function MenuView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [category, setCategory] = useState(ALL);
  // Tăng số này để tải lại menu (nút Thử lại)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Bỏ kết quả nếu màn hình đã đóng hoặc đã bấm tải lại trước khi API trả về
    let cancelled = false;
    getProducts()
      .then((products) => {
        if (!cancelled) setState({ status: "ready", products });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Không tải được menu, vui lòng thử lại.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  if (state.status === "loading") {
    return (
      <p role="status" className="py-10 text-center text-stone-500">
        Đang tải menu...
      </p>
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

  if (state.products.length === 0) {
    return (
      <p className="py-10 text-center text-stone-500">Chưa có món nào</p>
    );
  }

  const groups = groupByCategory(state.products);
  const categories = [...groups.keys()];
  // "Tất cả" (hoặc danh mục không còn trong dữ liệu mới tải) thì hiện mọi danh mục
  const shown = categories.includes(category) ? [category] : categories;

  return (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories}
        selected={category}
        onSelect={setCategory}
      />
      {shown.map((name) => (
        <section key={name} aria-label={name}>
          <h2 className="mb-3 text-lg font-semibold">{name}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(groups.get(name) ?? []).map((product) => (
              <li key={product.id}>
                {/* Món "Hết món" vẫn mở được chi tiết để xem số ly còn (Activity-01) */}
                <Link
                  href={`/products/${product.id}`}
                  className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <ProductCard product={product} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}