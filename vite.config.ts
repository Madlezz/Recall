import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2021",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          markdown: ["react-markdown", "remark-gfm", "remark-math", "rehype-katex", "rehype-highlight", "rehype-raw"],
          math: ["katex"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-alert-dialog", "@radix-ui/react-select", "@radix-ui/react-label", "@radix-ui/react-tabs"],
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