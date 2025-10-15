import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Use forks pool for parallel test execution
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false // Enable parallel execution
      }
    },

    // Global test setup/teardown
    setupFiles: ["./test/setup.ts"],

    // Test environment
    environment: "node",

    // Global test APIs (no need to import describe, it, expect)
    globals: true,

    // Exclude E2E tests (they use Jest + Puppeteer)
    exclude: ["**/node_modules/**", "**/test/e2e/**"],

    // Coverage configuration (optional)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "test/**", "**/*.config.*", "**/*.test.*", ".next/**", "out/**"]
    }
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/src": path.resolve(__dirname, "./src"),
      "@/test": path.resolve(__dirname, "./test")
    }
  }
});
