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
        // Ratchet: set to actual measured coverage (2026-06-24, 295 tests).
        // Prevents regression — deleting tests or reducing coverage fails CI.
        // Raise these as more store/service/component tests are added.
        // Target: 45-55% lines once recall-store.ts + components have coverage.
        lines: 18,
        functions: 14,
        branches: 16,
        statements: 17,
      },
    },
  },
});