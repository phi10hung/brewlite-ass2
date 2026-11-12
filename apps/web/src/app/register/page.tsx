import RegisterForm from "@/components/RegisterForm";

// Trang đăng ký tài khoản Khách hàng /register (FR-08)
export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Đăng ký</h1>
      <RegisterForm />
    </section>
  );
}