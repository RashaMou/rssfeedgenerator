import { defineConfig } from "vite";
import { resolve } from "path";
import { configDefaults } from "vitest/config";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["cheerio", "feed", "uuid"],
        },
      },
    },
    emptyOutDir: true,
    target: "esnext",
    minify: "terser",
  },
  publicDir: "public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    ...configDefaults,
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/frontend/setup.ts"],
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
