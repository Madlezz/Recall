import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2021",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) return "vendor";
            if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
            if (id.includes("@radix-ui")) return "ui";
            if (id.includes("react-markdown") || id.includes("remark") || id.includes("rehype") || id.includes("katex")) return "markdown";
          }
        },
      },
    },
  },
  optimizeDeps: {},
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});