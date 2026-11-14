import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import StaffOrdersView from "./StaffOrdersView";

// Đơn giống API GET /staff/orders trả về
function order(id: number, code: string, status: string, extra = {}) {
  return {
    id,
    code,
    status,
    subtotal: 57000,
    discount: 0,
    total: 57000,
    promotionCode: null,
    paymentMethod: "CARD",
    expiresAt: "2026-11-13T03:10:00.000Z",
    createdAt: "2026-11-13T03:05:00.000Z",
    refundStatus: null,
    customerName: "Khách hàng mẫu",
    items: [
      {
        productId: 4,
        productName: "Latte",
        size: "L",
        toppings: ["Shot espresso"],
        quantity: 1,
        unitPrice: 57000,
        lineTotal: 57000,
      },
    ],
    ...extra,
  };
}

const PAID = order(1, "BL-AB12CD", "PAID");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Thay fetch bằng hàm giả trả lần lượt các kết quả, không cần chạy API thật
function mockFetch(...results: Response[]) {
  const fetchMock = vi.fn();
  for (const result of results) fetchMock.mockResolvedValueOnce(result);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const urlOf = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
  String(fetchMock.mock.calls[call][0]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Màn hình quầy của nhân viên (CT-53 – CT-58)", () => {
  it("CT-53: mặc định gọi GET /staff/orders?status=PAID, hiện mã đơn, giờ, tên khách, món, tổng tiền; đơn đã thanh toán có nút Nhận đơn và Hủy đơn", async () => {
    const fetchMock = mockFetch(jsonResponse([PAID]));
    render(<StaffOrdersView />);

    const card = await screen.findByRole("listitem", { name: "Đơn BL-AB12CD" });
    expect(urlOf(fetchMock, 0)).toMatch(/\/staff\/orders\?status=PAID$/);
    // 03:05 giờ UTC = 10:05 giờ Việt Nam
    expect(card).toHaveTextContent("10:05 13/11/2026");
    expect(card).toHaveTextContent("Khách: Khách hàng mẫu");
    expect(card).toHaveTextContent("1 × Latte (L) + Shot espresso");
    expect(card).toHaveTextContent("57.000đ");
    expect(card).toHaveTextContent("Thẻ");
    expect(within(card).getByText("Đã thanh toán")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Nhận đơn" }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Hủy đơn" }),
    ).toBeInTheDocument();
  });

  it("CT-54: đổi bộ lọc thì gọi lại API theo trạng thái; Tất cả thì không gửi status", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse([PAID]),
      jsonResponse([order(2, "BL-PHA001", "PREPARING")]),
      jsonResponse([PAID]),
    );
    render(<StaffOrdersView />);
    await screen.findByText("BL-AB12CD");

    await user.click(screen.getByRole("button", { name: "Đang pha chế" }));
    expect(await screen.findByText("BL-PHA001")).toBeInTheDocument();
    expect(urlOf(fetchMock, 1)).toMatch(/\/staff\/orders\?status=PREPARING$/);
    expect(
      screen.getByRole("button", { name: "Đang pha chế" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Tất cả" }));
    await screen.findByText("BL-AB12CD");
    expect(urlOf(fetchMock, 2)).toMatch(/\/staff\/orders$/);
  });

  it("CT-55: nút theo bước Nhận đơn → Pha xong → Giao khách; bấm Nhận đơn gửi PATCH trạng thái PREPARING, báo thành công và tải lại danh sách", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse([
        PAID,
        order(2, "BL-PHA001", "PREPARING"),
        order(3, "BL-XONG01", "READY"),
        order(4, "BL-GIAO01", "COMPLETED"),
      ]),
      jsonResponse({ ...PAID, status: "PREPARING" }),
      jsonResponse([]),
    );
    render(<StaffOrdersView />);

    const preparing = await screen.findByRole("listitem", {
      name: "Đơn BL-PHA001",
    });
    expect(within(preparing).getByRole("button")).toHaveTextContent("Pha xong");
    expect(
      within(screen.getByRole("listitem", { name: "Đơn BL-XONG01" })).getByRole(
        "button",
      ),
    ).toHaveTextContent("Giao khách");
    // Đơn đã giao xong không còn nút nào
    expect(
      within(
        screen.getByRole("listitem", { name: "Đơn BL-GIAO01" }),
      ).queryByRole("button"),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Nhận đơn" }));

    expect(await screen.findByText("Đơn BL-AB12CD: Đang pha chế")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/staff\/orders\/1\/status$/);
    expect(init).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ status: "PREPARING" }),
    });
    // Tải lại danh sách sau khi đổi trạng thái
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(urlOf(fetchMock, 2)).toMatch(/\/staff\/orders\?status=PAID$/);
  });

  it("CT-56: đơn vừa bị nhân viên khác đổi (409) thì hiện câu báo của API và tải lại danh sách", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse([PAID]),
      jsonResponse(
        { statusCode: 409, message: "Đơn vừa đổi trạng thái, vui lòng tải lại" },
        409,
      ),
      jsonResponse([]),
    );
    render(<StaffOrdersView />);

    await user.click(await screen.findByRole("button", { name: "Nhận đơn" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Đơn vừa đổi trạng thái, vui lòng tải lại",
    );
    expect(await screen.findByText("Không có đơn nào")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("CT-57: Hủy đơn hỏi xác nhận; không đồng ý thì không gọi API, đồng ý thì gửi CANCELLED; đơn đã hủy hiện tình trạng hoàn tiền", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse([PAID]),
      jsonResponse({ ...PAID, status: "CANCELLED", refundStatus: "FAILED" }),
      jsonResponse([
        { ...PAID, status: "CANCELLED", refundStatus: "FAILED" },
      ]),
    );
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<StaffOrdersView />);

    const cancel = await screen.findByRole("button", { name: "Hủy đơn" });
    await user.click(cancel);
    expect(confirm).toHaveBeenCalledWith(
      "Hủy đơn BL-AB12CD? Nguyên liệu được trả lại kho và khách được hoàn tiền.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(cancel);
    expect(await screen.findByText("Đơn BL-AB12CD: Đã hủy")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    // Hoàn tiền lần trước lỗi (FAILED) vẫn hiện "Đang hoàn tiền" vì hệ thống tự thử lại
    expect(await screen.findByText("Đang hoàn tiền")).toBeInTheDocument();
  });

  it("CT-58: trạng thái đang tải, trống, lỗi kèm Thử lại; tài khoản không phải nhân viên (403) thì báo, không có Thử lại", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { unmount } = render(<StaffOrdersView />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải đơn hàng...");
    unmount();

    mockFetch(
      jsonResponse({ statusCode: 500, message: "Internal server error" }, 500),
      jsonResponse([]),
    );
    const second = render(<StaffOrdersView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Hệ thống đang bận, vui lòng thử lại sau.",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Không có đơn nào")).toBeInTheDocument();
    second.unmount();

    mockFetch(
      jsonResponse(
        { statusCode: 403, message: "Chỉ nhân viên được truy cập" },
        403,
      ),
    );
    render(<StaffOrdersView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Chỉ nhân viên được truy cập",
    );
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  });
});