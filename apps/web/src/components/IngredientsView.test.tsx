import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import IngredientsView from "./IngredientsView";

// Giống API GET /staff/ingredients trả về: Bơ sáp sắp hết
const INGREDIENTS = [
  { id: 1, name: "Cà phê xay", unit: "g", stock: 3000, lowStock: false },
  { id: 15, name: "Bơ sáp", unit: "g", stock: 100, lowStock: true },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...results: Response[]) {
  const fetchMock = vi.fn();
  for (const result of results) fetchMock.mockResolvedValueOnce(result);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Màn hình kho nguyên liệu (CT-63 – CT-66)", () => {
  it("CT-63: gọi GET /staff/ingredients, hiện tồn kho từng nguyên liệu, nguyên liệu sắp hết có nhãn Sắp hết", async () => {
    const fetchMock = mockFetch(jsonResponse(INGREDIENTS));
    render(<IngredientsView />);

    const bo = await screen.findByRole("listitem", { name: "Bơ sáp" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/staff\/ingredients$/);
    expect(bo).toHaveTextContent("Còn 100 g");
    expect(within(bo).getByText("Sắp hết")).toBeInTheDocument();
    const caPhe = screen.getByRole("listitem", { name: "Cà phê xay" });
    expect(caPhe).toHaveTextContent("Còn 3.000 g");
    expect(within(caPhe).queryByText("Sắp hết")).toBeNull();
  });

  it("CT-64: số lượng không hợp lệ thì báo lỗi ngay, không gọi API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(jsonResponse(INGREDIENTS));
    render(<IngredientsView />);

    const bo = await screen.findByRole("listitem", { name: "Bơ sáp" });
    const input = within(bo).getByRole("textbox", {
      name: "Số lượng nhập Bơ sáp",
    });
    const button = within(bo).getByRole("button", { name: "Nhập kho" });

    for (const [value, message] of [
      ["", "Số lượng nhập phải là số nguyên"],
      ["1,5", "Số lượng nhập phải là số nguyên"],
      ["0", "Số lượng nhập phải lớn hơn 0"],
      ["2000000", "Số lượng nhập tối đa 1.000.000 mỗi lần"],
    ]) {
      await user.clear(input);
      if (value) await user.type(input, value);
      await user.click(button);
      expect(within(bo).getByRole("alert")).toHaveTextContent(message);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("CT-65: nhập hợp lệ gọi POST restock, cập nhật tồn kho, bỏ nhãn Sắp hết và báo đã nhập", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse(INGREDIENTS),
      jsonResponse({ id: 15, name: "Bơ sáp", unit: "g", stock: 2100, lowStock: false }),
    );
    render(<IngredientsView />);

    const bo = await screen.findByRole("listitem", { name: "Bơ sáp" });
    await user.type(
      within(bo).getByRole("textbox", { name: "Số lượng nhập Bơ sáp" }),
      "2000",
    );
    await user.click(within(bo).getByRole("button", { name: "Nhập kho" }));

    expect(await within(bo).findByRole("status")).toHaveTextContent(
      "Đã nhập 2.000 g",
    );
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/staff\/ingredients\/15\/restock$/);
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ amount: 2000 }),
    });
    expect(bo).toHaveTextContent("Còn 2.100 g");
    expect(within(bo).queryByText("Sắp hết")).toBeNull();
    expect(
      within(bo).getByRole("textbox", { name: "Số lượng nhập Bơ sáp" }),
    ).toHaveValue("");
  });

  it("CT-66: API báo lỗi khi nhập kho thì hiện câu báo ở dòng đó; tải danh sách lỗi thì có Thử lại", async () => {
    const user = userEvent.setup();
    mockFetch(
      jsonResponse(INGREDIENTS),
      jsonResponse(
        { statusCode: 404, message: "Không tìm thấy nguyên liệu" },
        404,
      ),
    );
    const { unmount } = render(<IngredientsView />);

    const bo = await screen.findByRole("listitem", { name: "Bơ sáp" });
    await user.type(
      within(bo).getByRole("textbox", { name: "Số lượng nhập Bơ sáp" }),
      "500",
    );
    await user.click(within(bo).getByRole("button", { name: "Nhập kho" }));
    expect(await within(bo).findByRole("alert")).toHaveTextContent(
      "Không tìm thấy nguyên liệu",
    );
    expect(bo).toHaveTextContent("Còn 100 g");
    unmount();

    mockFetch(
      jsonResponse({ statusCode: 500, message: "Internal server error" }, 500),
      jsonResponse(INGREDIENTS),
    );
    render(<IngredientsView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Hệ thống đang bận, vui lòng thử lại sau.",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("listitem", { name: "Bơ sáp" })).toBeInTheDocument();
  });
});