import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// NOTE: this config grows over the course of implementation — the `storybook` project
// (Playwright browser mode via @storybook/addon-vitest) is added once Storybook itself is
// set up (Milestone 7). For now, `unit` (pure adapter/module logic, Node) and `component`
// (real MUI picker components + AdapterTemporal, jsdom + React Testing Library).
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        branches: 85,
        functions: 90,
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/components/**'],
          globals: true,
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['test/components/**/*.test.tsx'],
          globals: true,
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
});
