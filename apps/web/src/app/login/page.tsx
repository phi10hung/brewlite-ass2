import LoginForm from "@/components/LoginForm";

// Trang đăng nhập /login (FR-09). ?next=/trang-truoc: đăng nhập xong quay lại trang đó.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Đăng nhập</h1>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </section>
  );
}