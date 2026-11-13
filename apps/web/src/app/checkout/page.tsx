import CheckoutView from "@/components/CheckoutView";

// Trang Checkout /checkout (FR-06, FR-07). Giỏ và phiên đăng nhập nằm ở trình duyệt nên nội dung hiện trong CheckoutView.
export default function CheckoutPage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Thanh toán</h1>
      <CheckoutView />
    </section>
  );
}
