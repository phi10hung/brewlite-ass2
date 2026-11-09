import { describe, expect, it } from "vitest";

// Test cố ý sai để chụp minh chứng CI phát hiện lỗi (đề mục 6.4).
// Commit kế tiếp sẽ xóa tệp này.
describe("Kiểm tra CI phát hiện lỗi", () => {
  it("cố ý sai: 1 + 1 không bằng 3", () => {
    expect(1 + 1).toBe(3);
  });
});