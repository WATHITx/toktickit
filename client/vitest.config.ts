import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    globals: true,
    // jsdom workers are memory-hungry; the default (one per CPU core) froze a 16 GB laptop
    maxWorkers: 2,
    minWorkers: 1,
  },
});