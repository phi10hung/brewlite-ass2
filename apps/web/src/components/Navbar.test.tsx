import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Navbar, { NAV_LINKS } from "./Navbar";

describe("Navbar (CT-01 – CT-02)", () => {
  it("hiển thị tên BrewLite và dẫn về trang chủ", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "BrewLite" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("hiển thị đủ các mục điều hướng", () => {
    render(<Navbar />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav).toBeInTheDocument();
    for (const link of NAV_LINKS) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href,
      );
    }
  });
});