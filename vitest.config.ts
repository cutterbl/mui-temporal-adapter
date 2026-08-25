import { defineConfig } from 'vitest/config';

// NOTE: this config grows over the course of implementation — the `component`
// project (jsdom + React Testing Library) is added once AdapterTemporal and
// the picker-rendering tests exist (Milestone 2/5), and the `storybook`
// project (Playwright browser mode via @storybook/addon-vitest) is added
// once Storybook itself is set up (Milestone 7). For now, just `unit`.
export default defineConfig({
  test: {
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
    ],
  },
});
