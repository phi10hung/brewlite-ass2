import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TextField from "@/components/TextField";
import { ApiError } from "@/lib/api";
import { register, validateRegister, type FieldErrors } from "@/lib/auth";

// Form đăng ký (FR-08): kiểm tra trước khi gửi, lỗi tiếng Việt;
// thành công thì được đăng nhập luôn và chuyển về trang chủ.
export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<
    FieldErrors<"name" | "email" | "password">
  >({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateRegister({ name, email, password });
    setErrors(found);
    setServerError("");
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register(name, email, password);
      router.replace("/");
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Không đăng ký được, vui lòng thử lại.",
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
        id="name"
        label="Họ tên"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
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
        label="Mật khẩu (tối thiểu 6 ký tự)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark disabled:bg-stone-400"
      >
        {submitting ? "Đang đăng ký..." : "Đăng ký"}
      </button>
      <p className="text-center text-sm">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-brand underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}