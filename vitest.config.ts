// Packages:
import { defineConfig } from 'vitest/config'

// Exports:
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10_000,
    hookTimeout: 60_000,
  },
})
