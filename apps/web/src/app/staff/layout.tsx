import StaffGuard from "@/components/StaffGuard";

// Mọi trang /staff/* dùng chung khung này: chỉ tài khoản Nhân viên xem được (FR-22 – FR-24)
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <StaffGuard>{children}</StaffGuard>;
}