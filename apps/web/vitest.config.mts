import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Hiểu đường dẫn "@/..." khai báo trong tsconfig.json
  resolve: { tsconfigPaths: true },
  test: {
    // jsdom giả lập trình duyệt để render component trong Node.js
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});