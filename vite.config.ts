/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Tauri needs a fixed, predictable dev port. Same port for plain `npm run dev`
// keeps the workflow consistent.
const DEV_PORT = 1420;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: DEV_PORT,
    strictPort: true,
    host: false,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@adapters": path.resolve(__dirname, "./src/adapters"),
      "@state": path.resolve(__dirname, "./src/state"),
      "@ui": path.resolve(__dirname, "./src/ui"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
