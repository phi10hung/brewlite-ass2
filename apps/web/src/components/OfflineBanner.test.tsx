import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfflineBanner from "./OfflineBanner";

// Giả lập trạng thái mạng của trình duyệt
function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OfflineBanner (CT-21 – CT-22)", () => {
  it("không hiện gì khi có mạng", () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hiện thông báo tiếng Việt khi mất mạng", () => {
    setOnline(true);
    render(<OfflineBanner />);

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Bạn đang ngoại tuyến",
    );
  });
});