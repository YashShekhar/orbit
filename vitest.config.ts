import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/client/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/client',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/api.ts',
        'src/hooks/*.ts',
        'src/features/tasks/selectors.ts',
        'src/components/ui/Modal.tsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
