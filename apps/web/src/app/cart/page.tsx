import CartView from "@/components/CartView";

// Trang giỏ hàng /cart (FR-04). Giỏ lưu ở trình duyệt nên nội dung hiện trong CartView.
export default function CartPage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Giỏ hàng</h1>
      <CartView />
    </section>
  );
}