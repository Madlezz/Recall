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
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "e2e/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "vitest.config.ts",
        "vite.config.ts",
        "playwright.config.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/types.ts",
        "src/**/*.d.ts",
      ],
      thresholds: {
        lines: 14,
        functions: 8,
        branches: 12,
        statements: 13,
      },
    },
  },
});