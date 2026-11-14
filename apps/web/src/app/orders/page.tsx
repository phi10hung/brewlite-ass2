import OrdersView from "@/components/OrdersView";

// Trang lịch sử đơn /orders (FR-20)
export default function OrdersPage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Đơn hàng của tôi</h1>
      <OrdersView />
    </section>
  );
}