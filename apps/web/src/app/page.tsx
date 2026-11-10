import MenuView from "@/components/MenuView";

// Trang chủ là màn Menu (FR-01, FR-02).
// Dữ liệu tải ở trình duyệt trong MenuView để có trạng thái đang tải, lỗi và nút Thử lại (NFR-12).
export default function Home() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Thực đơn</h1>
      <MenuView />
    </section>
  );
}