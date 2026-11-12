import Image from "next/image";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/lib/products";

// Thẻ một món trên menu: ảnh, tên, giá.
// Món không còn pha nổi 1 ly size S thì ảnh mờ và xám đi, có nhãn "Hết món" (FR-02, BR-03).
export default function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;

  return (
    <article className="h-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-stone-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          // Điện thoại 2 cột, máy tính bảng 3 cột, máy tính 4 cột: tải ảnh vừa đủ cỡ
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={`object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-md bg-red-700 px-2 py-1 text-xs font-semibold text-white">
            Hết món
          </span>
        )}
      </div>
      <div className="p-3">
        <h3
          className={`font-semibold leading-snug ${soldOut ? "text-stone-500" : ""}`}
        >
          {product.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-brand">
          {formatVnd(product.price)}
        </p>
      </div>
    </article>
  );
}