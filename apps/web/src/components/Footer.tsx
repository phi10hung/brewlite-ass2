// Chân trang: điện thoại xếp 2 dòng giữa màn hình; từ màn hình rộng (sm) dàn thành 1 hàng.
export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 text-center text-sm text-stone-500 sm:flex sm:justify-between sm:text-left">
        <p>© 2026 BrewLite – Đặt đồ uống không dùng tiền mặt</p>
        <p>Nhóm 12 · Công nghệ Phần mềm</p>
      </div>
    </footer>
  );
}