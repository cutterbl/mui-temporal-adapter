import { Suspense } from 'react';
import type { Preview } from '@storybook/react-vite';
import TemporalLocalizationProvider from '../src/TemporalLocalizationProvider';

/**
 * Per-story options read from a story's own `parameters.temporal` — lets an individual
 * story (e.g. `LazyPolyfillEnvironment.stories.tsx`, `LocaleWeekStart.stories.tsx`) force a
 * specific locale or fallback path without every story needing its own
 * `<TemporalLocalizationProvider>` boilerplate.
 */
interface TemporalStoryParameters {
  adapterLocale?: string;
  forcePolyfill?: boolean;
  forceWeekInfoFallback?: boolean;
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    // Storybook's actual default sidebar order is "configuration order" (roughly, the order
    // stories were discovered/imported) — *not* alphabetical by title, despite that being an
    // easy assumption. The 8 `stories/docs/*.mdx` pages are each titled with a leading number
    // (`'Docs/1. Introduction'`, `'Docs/2. Getting Started'`, …) specifically so they read in
    // order in the sidebar; without this, they show up in whatever order Storybook happened
    // to discover the files in instead. `'alphabetical'` sorts by the title string, which
    // sorts those numbered titles correctly (single digits, 1–8, so no "10 before 2"
    // lexicographic gotcha to worry about).
    options: {
      storySort: {
        method: 'alphabetical',
      },
    },
  },
  decorators: [
    (Story, context) => {
      // `context.parameters` isn't typed per-project by Storybook itself — narrowed to our
      // own shape via a named interface rather than reaching for `any`.
      const temporalParams = context.parameters['temporal'] as TemporalStoryParameters | undefined;
      return (
        <Suspense fallback={<p>Loading the Temporal adapter…</p>}>
          <TemporalLocalizationProvider {...temporalParams}>
            <Story />
          </TemporalLocalizationProvider>
        </Suspense>
      );
    },
  ],
};

export default preview;
