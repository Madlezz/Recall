import path from "node:path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/Recall/" : "/",
  plugins: [
    react(),
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // Don't cache KaTeX CSS from CDN - let browser handle it
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: "Recall - Spaced Repetition That Makes You Come Back",
        short_name: "Recall",
        description: "FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "en",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
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
            if (id.includes("ts-fsrs")) return "fsrs";
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
}));