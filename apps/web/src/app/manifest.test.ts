import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("Web app manifest (CT-20)", () => {
  it("đủ thông tin để trình duyệt cho cài lên màn hình chính", () => {
    const m = manifest();
    expect(m.name).toBe("BrewLite – Đặt đồ uống");
    expect(m.short_name).toBe("BrewLite");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    const sizes = (m.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });
});