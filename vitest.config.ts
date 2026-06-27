import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["./src/test-setup.ts"],
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
              // Ratchet: set to actual measured coverage (2026-06-27, 731 tests).
              lines: 32,
              functions: 29,
              branches: 29,
              statements: 32,
            },
    },
  },
});