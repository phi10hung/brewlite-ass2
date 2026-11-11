import { apiFetch } from "./api";
import { saveSession, type Session } from "./session";

// Lỗi của từng ô nhập; ô không có lỗi thì không có khóa đó
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kiểm tra trước khi gửi, cùng câu báo lỗi với API (FR-08 tiêu chí 2, 6; NFR-06)
export function validateRegister(form: {
  name: string;
  email: string;
  password: string;
}): FieldErrors<"name" | "email" | "password"> {
  const errors: FieldErrors<"name" | "email" | "password"> = {};
  if (form.name.trim() === "") errors.name = "Vui lòng nhập họ tên";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Email không hợp lệ";
  if (form.password.length < 6) errors.password = "Mật khẩu tối thiểu 6 ký tự";
  return errors;
}

export function validateLogin(form: {
  email: string;
  password: string;
}): FieldErrors<"email" | "password"> {
  const errors: FieldErrors<"email" | "password"> = {};
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Email không hợp lệ";
  if (form.password === "") errors.password = "Vui lòng nhập mật khẩu";
  return errors;
}

// Đăng nhập (FR-09): API trả JWT và thông tin tài khoản, web lưu lại làm phiên
export async function login(email: string, password: string): Promise<Session> {
  const session = await apiFetch<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  saveSession(session);
  return session;
}

// Đăng ký (FR-08): thành công thì được đăng nhập luôn
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<Session> {
  const session = await apiFetch<Session>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
  });
  saveSession(session);
  return session;
}