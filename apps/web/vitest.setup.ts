import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Thêm các hàm kiểm tra cho giao diện như toBeInTheDocument(), toHaveAttribute()
// và dọn giao diện đã render sau mỗi test để các test không ảnh hưởng nhau.
afterEach(() => {
  cleanup();
});