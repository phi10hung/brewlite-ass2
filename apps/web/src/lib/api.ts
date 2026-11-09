// Hàm gọi API NestJS dùng chung cho mọi màn hình (ADR 002).
// Địa chỉ API lấy từ NEXT_PUBLIC_API_URL, được ghi vào lúc build;
// máy cá nhân chưa khai báo thì dùng http://localhost:4000.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Lỗi khi gọi API. message luôn là câu tiếng Việt để hiển thị thẳng cho người dùng (NFR-12).
// status = 0 nghĩa là không kết nối được máy chủ.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function messageFor(status: number, body: unknown): string {
  if (status >= 500) {
    return "Hệ thống đang bận, vui lòng thử lại sau.";
  }
  // Lỗi 4xx: dùng câu báo lỗi API gửi về nếu có (API viết câu báo lỗi bằng tiếng Việt)
  if (body && typeof body === "object" && "message" in body) {
    const message = body.message;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }
  if (status === 401) return "Vui lòng đăng nhập để tiếp tục.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu.";
  return "Dữ liệu gửi lên không hợp lệ.";
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
    );
  }

  // Có phản hồi không kèm dữ liệu JSON (ví dụ 204) nên đọc lỗi thì coi như null
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, messageFor(response.status, body));
  }
  return body as T;
}