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
            if (id.includes("react-markdown") || id.includes("remark") || id.includes("rehype") || id.includes("katex")) return "markdown";
            if (id.includes("katex")) return "math";
            if (id.includes("@radix-ui")) return "ui";
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2021",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});