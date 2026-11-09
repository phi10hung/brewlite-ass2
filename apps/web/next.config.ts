import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không tự tạo tệp AGENTS.md (ghi chú cho công cụ AI) mỗi lần chạy npm run dev
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;