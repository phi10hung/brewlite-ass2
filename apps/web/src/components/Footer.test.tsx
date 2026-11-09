import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./Footer";

describe("Footer (CT-03)", () => {
  it("hiển thị tên ứng dụng và nhóm thực hiện", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(/BrewLite/)).toBeInTheDocument();
    expect(screen.getByText(/Nhóm 12/)).toBeInTheDocument();
  });
});