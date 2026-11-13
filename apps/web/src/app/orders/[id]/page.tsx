import OrderDetailView from "@/components/OrderDetailView";

// Trang chi tiết đơn /orders/:id (FR-19 tiêu chí 4, FR-20).
// Dữ liệu tải ở trình duyệt trong OrderDetailView để có trạng thái đang tải, lỗi, không tìm thấy (NFR-12).
export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  // key: sang đơn khác thì trang chi tiết tải lại từ đầu
  return <OrderDetailView key={id} id={id} />;
}