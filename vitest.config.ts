import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/types.ts",
        "src/**/*.d.ts",
        "node_modules/**",
        "e2e/**",
        "vitest.config.ts",
        "vite.config.ts",
        "playwright.config.ts",
      ],
      thresholds: {
        lines: 14,
        functions: 9,
        branches: 13,
        statements: 14,
      },
    },
  },
});