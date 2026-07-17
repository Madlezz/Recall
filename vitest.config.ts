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
    exclude: ["e2e/**", "node_modules/**", "**/node_modules/**", "sync-relay/**"],
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
        "sync-relay/**",
        "vitest.config.ts",
        "vite.config.ts",
        "playwright.config.ts",
      ],
      thresholds: {
        // Ratchet 2026-07-18 measured (796 tests): Stmts 35.63 / Branch 30.33 /
        // Funcs 31.78 / Lines 36.37. Keep ~0.5pt under floor against flake.
        lines: 35,
        functions: 31,
        branches: 29,
        statements: 35,
      },
    },
  },
});