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
