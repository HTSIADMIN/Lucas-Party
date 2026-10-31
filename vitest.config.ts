import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@party\/shared$/, replacement: path.resolve(import.meta.dirname, "src/shared/index.ts") },
      { find: /^@party\/shared\/(.*)$/, replacement: path.resolve(import.meta.dirname, "src/shared/$1") },
      { find: /^@\/(.*)$/, replacement: path.resolve(import.meta.dirname, "src/$1") },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
