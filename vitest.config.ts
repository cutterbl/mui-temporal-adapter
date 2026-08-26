import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// `package.json` is ESM, so no `__dirname` of its own here either — see `vite.config.ts` for
// the same pattern.
const rootDir = fileURLToPath(new URL('.', import.meta.url));

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
      {
        extends: true,
        plugins: [
          // Turns every story into a real Vitest test — a story renders (and, for stories
          // with a `play` function, runs its interactions) inside an actual browser, not
          // just a visual smoke check. See `@storybook/addon-vitest`'s own docs.
          storybookTest({ configDir: resolve(rootDir, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
          // No `setupFiles` here on purpose: `PLAN.md` called for a `.storybook/vitest.setup.ts`
          // wiring `setProjectAnnotations(preview)` (the pattern older `@storybook/addon-vitest`
          // releases needed), but this installed version (10.5.10 / Storybook 10.3+) applies
          // `.storybook/preview.tsx`'s annotations to every story automatically — it says so
          // directly at test-run time if it finds a manual `setProjectAnnotations` call anyway.
          // See `DECISIONS.md`.
        },
      },
    ],
  },
});
