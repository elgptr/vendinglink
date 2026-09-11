import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Vite only exposes `process.env` for variables it has loaded. Prisma (and other
  // libs) read env vars from `process.env` at runtime, but Vitest does not
  // auto-populate it from `.env` / `.env.local` the way Next.js does.
  // Load all env files and inject them into `process.env` so integration tests
  // that build a real Prisma client can find DATABASE_URL and friends.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: "node",
      // Run test files serially (Vitest 3). All suites share the same real
      // Postgres DB, and each suite's afterAll wipes all tables — running
      // files in parallel lets one file's cleanup delete data another file's
      // in-flight tests are still using.
      fileParallelism: false,
      setupFiles: [],
      // e2e/*.spec.ts are Playwright specs (need a real browser) — keep them
      // out of Vitest's default include glob.
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        include: ["lib/**/*.ts", "app/api/**/*.ts"],
        exclude: ["**/*.test.ts", "**/*.spec.ts", "node_modules/"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  };
});
