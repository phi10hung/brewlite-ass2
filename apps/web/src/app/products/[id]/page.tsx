import ProductDetailView from "@/components/ProductDetailView";

// Trang chi tiết món /products/:id (FR-03).
// Dữ liệu tải ở trình duyệt trong ProductDetailView để có trạng thái đang tải, lỗi, không tìm thấy (NFR-12).
export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  // key: sang món khác thì màn chi tiết tải lại từ đầu
  return <ProductDetailView key={id} id={Number(id)} />;
}