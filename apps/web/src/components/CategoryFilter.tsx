// Nút đầu tiên của bộ lọc: hiện toàn bộ menu (FR-01)
export const ALL = "Tất cả";

type Props = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

// Hàng nút lọc theo danh mục. Nút xuống dòng khi hết chỗ (flex-wrap)
// để màn hình 375 px không bị cuộn ngang (NFR-10).
export default function CategoryFilter({
  categories,
  selected,
  onSelect,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Lọc theo danh mục"
      className="flex flex-wrap gap-2"
    >
      {[ALL, ...categories].map((category) => {
        const active = category === selected;
        return (
          <button
            key={category}
            type="button"
            // aria-pressed báo cho trình đọc màn hình biết nút nào đang được chọn
            aria-pressed={active}
            onClick={() => onSelect(category)}
            // min-h-11 = 44 px: đủ lớn để bấm bằng ngón tay (NFR-10)
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              active
                ? "border-brand bg-brand text-white"
                : "border-stone-300 bg-white hover:bg-stone-100"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}