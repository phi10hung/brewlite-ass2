// Service worker của BrewLite (ADR 002, NFR-14).
// Lưu tạm trang đã mở, tệp giao diện và dữ liệu menu để mở lại được khi mất mạng.
// Đổi tên CACHE (ví dụ brewlite-v2) khi muốn xóa toàn bộ bản lưu cũ.
const CACHE = "brewlite-v1";

self.addEventListener("install", () => {
  // Bản service worker mới chạy ngay, không chờ đóng hết các tab cũ
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Xóa bản lưu của phiên bản cũ, rồi điều khiển luôn các trang đang mở
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Có mạng: lấy bản mới nhất và lưu lại. Mất mạng: dùng bản đã lưu.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Tệp trong /_next/static/ có mã băm trong tên, không bao giờ đổi nội dung: có bản lưu thì dùng luôn
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Chỉ lưu yêu cầu đọc (GET); đặt đơn, thanh toán luôn cần mạng
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);

  if (request.mode === "navigate" || url.pathname.startsWith("/products")) {
    // Mở trang, hoặc gọi API menu GET /products, GET /products/:id
    event.respondWith(networkFirst(request));
  } else if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirst(request));
  }
});