import type { MetadataRoute } from "next";

// Web app manifest: thông tin để trình duyệt cho phép cài BrewLite lên màn hình chính (ADR 002, NFR-11).
// Next.js tự phục vụ tệp này tại /manifest.webmanifest và chèn thẻ <link rel="manifest"> vào mọi trang.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrewLite – Đặt đồ uống",
    short_name: "BrewLite",
    description: "Đặt đồ uống và thanh toán không dùng tiền mặt",
    lang: "vi",
    start_url: "/",
    // Mở như một ứng dụng riêng, không có thanh địa chỉ của trình duyệt
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#78350f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Bản cho Android cắt theo hình tròn, bo góc; hình vẽ nằm trong vùng an toàn ở giữa
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}