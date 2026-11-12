import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OfflineBanner from "@/components/OfflineBanner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SessionWatcher from "@/components/SessionWatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLite – Đặt đồ uống",
  description: "Đặt đồ uống và thanh toán không dùng tiền mặt",
};

// Màu thanh trạng thái, thanh địa chỉ trên điện thoại (trùng theme_color của manifest)
export const viewport: Viewport = {
  themeColor: "#78350f",
};

// Layout chung cho mọi trang: Navbar ở trên, nội dung ở giữa, Footer ở dưới.
// Viết theo hướng mobile-first: lớp không tiền tố dành cho điện thoại,
// lớp có tiền tố sm:, md: chỉ áp dụng khi màn hình rộng hơn.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Navbar />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer />
        <ServiceWorkerRegister />
        <SessionWatcher />
      </body>
    </html>
  );
}