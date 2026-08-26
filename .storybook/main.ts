import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook configuration. `stories` picks up both the 5 `.stories.tsx` files (see
 * `PLAN.md`'s Documentation section) and the 8 beginner-guide `.mdx` pages under
 * `stories/docs/`, so both show up in the same sidebar.
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
