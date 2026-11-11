"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TextField from "@/components/TextField";
import { ApiError } from "@/lib/api";
import { login, validateLogin, type FieldErrors } from "@/lib/auth";
import { safeNext } from "@/lib/session";

// Form đăng nhập (FR-09): kiểm tra trước khi gửi, lỗi tiếng Việt;
// đăng nhập xong quay lại trang đang xem trước đó (next), mặc định trang chủ.
export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateLogin({ email, password });
    setErrors(found);
    setServerError("");
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await login(email, password);
      router.replace(safeNext(next));
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Không đăng nhập được, vui lòng thử lại.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
          {serverError}
        </p>
      )}
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <TextField
        id="password"
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark disabled:bg-stone-400"
      >
        {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="text-center text-sm">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-brand underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}