import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@content": fileURLToPath(new URL("../content", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [".", "../content"] },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
