import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MenuView from "./MenuView";

// Dữ liệu giả giống API GET /products trả về: 3 danh mục, 1 món hết nguyên liệu
const PRODUCTS = [
  {
    id: 1,
    name: "Cà phê đen đá",
    description: "Cà phê phin đậm vị.",
    category: "Cà phê",
    price: 25000,
    imageUrl: "/images/products/ca-phe-den-da.jpg",
    stock: 150,
  },
  {
    id: 3,
    name: "Bạc xỉu",
    description: "Nhiều sữa, ít cà phê.",
    category: "Cà phê",
    price: 32000,
    imageUrl: "/images/products/bac-xiu.jpg",
    stock: 90,
  },
  {
    id: 6,
    name: "Trà đào cam sả",
    description: "Trà đen thơm mùi sả.",
    category: "Trà",
    price: 45000,
    imageUrl: "/images/products/tra-dao-cam-sa.jpg",
    stock: 40,
  },
  {
    id: 14,
    name: "Sinh tố bơ",
    description: "Bơ sáp xay cùng sữa.",
    category: "Nước ép, sinh tố",
    price: 55000,
    imageUrl: "/images/products/sinh-to-bo.jpg",
    stock: 0,
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Thay fetch của trình duyệt bằng hàm giả, không cần chạy API thật
function mockFetch(...results: Array<Response | Error>) {
  const fetchMock = vi.fn();
  for (const result of results) {
    if (result instanceof Error) fetchMock.mockRejectedValueOnce(result);
    else fetchMock.mockResolvedValueOnce(result);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn hình Menu (CT-10 – CT-18)", () => {
  it("CT-10: hiển thị trạng thái đang tải khi API chưa trả về", () => {
    // Promise không bao giờ xong: màn hình đứng ở trạng thái đang tải
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<MenuView />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải menu...");
  });

  it("CT-11: gọi GET /products và hiển thị tên, giá, ảnh của từng món", async () => {
    const fetchMock = mockFetch(jsonResponse(PRODUCTS));
    render(<MenuView />);

    expect(await screen.findByText("Cà phê đen đá")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/products$/);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("25.000đ")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Trà đào cam sả" }),
    ).toBeInTheDocument();
  });

  it("CT-12: chia món theo danh mục, đúng thứ tự dữ liệu trả về", async () => {
    mockFetch(jsonResponse(PRODUCTS));
    render(<MenuView />);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Cà phê",
      "Trà",
      "Nước ép, sinh tố",
    ]);
    const coffee = screen.getByRole("region", { name: "Cà phê" });
    expect(within(coffee).getAllByRole("listitem")).toHaveLength(2);
  });

  it("CT-13: chọn một danh mục thì chỉ hiện món thuộc danh mục đó", async () => {
    const user = userEvent.setup();
    mockFetch(jsonResponse(PRODUCTS));
    render(<MenuView />);

    await user.click(await screen.findByRole("button", { name: "Trà" }));

    expect(screen.getByRole("button", { name: "Trà" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Trà đào cam sả")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen đá")).not.toBeInTheDocument();
    expect(screen.queryByText("Sinh tố bơ")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("CT-14: chọn lại Tất cả thì hiện toàn bộ menu", async () => {
    const user = userEvent.setup();
    mockFetch(jsonResponse(PRODUCTS));
    render(<MenuView />);

    await user.click(await screen.findByRole("button", { name: "Trà" }));
    await user.click(screen.getByRole("button", { name: "Tất cả" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Tất cả" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("CT-15: chưa có món nào thì hiện thông báo trống", async () => {
    mockFetch(jsonResponse([]));
    render(<MenuView />);

    expect(await screen.findByText("Chưa có món nào")).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Lọc theo danh mục" }),
    ).not.toBeInTheDocument();
  });

  it("CT-16: mất kết nối thì báo lỗi tiếng Việt kèm nút Thử lại", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    render(<MenuView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
    );
    expect(
      within(alert).getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  });

  it("CT-17: bấm Thử lại thì tải lại menu", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      new TypeError("Failed to fetch"),
      jsonResponse(PRODUCTS),
    );
    render(<MenuView />);

    await user.click(await screen.findByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Cà phê đen đá")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("CT-18: server lỗi 500 thì không hiện mã lỗi thô", async () => {
    mockFetch(jsonResponse({ statusCode: 500, message: "Internal server error" }, 500));
    render(<MenuView />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Hệ thống đang bận, vui lòng thử lại sau.");
    expect(alert).not.toHaveTextContent("500");
    expect(alert).not.toHaveTextContent("Internal server error");
  });
});
describe("Menu mở trang chi tiết món (CT-24)", () => {
  it('CT-24: mỗi món, kể cả món "Hết món", là liên kết tới /products/:id', async () => {
    mockFetch(jsonResponse(PRODUCTS));
    render(<MenuView />);

    const soldOut = await screen.findByRole("link", { name: /Sinh tố bơ/ });
    expect(soldOut).toHaveAttribute("href", "/products/14");
    expect(screen.getByRole("link", { name: /Cà phê đen đá/ })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });
});