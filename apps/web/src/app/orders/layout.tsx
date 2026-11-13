import LoginRequired from "@/components/LoginRequired";

// Mọi trang /orders/* (lịch sử, chi tiết đơn) cần đăng nhập (FR-20)
export default function OrdersLayout({ children }: LayoutProps<"/orders">) {
  return <LoginRequired>{children}</LoginRequired>;
}