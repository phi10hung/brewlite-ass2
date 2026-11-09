import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLite – Đặt đồ uống",
  description: "Đặt đồ uống và thanh toán không dùng tiền mặt",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}