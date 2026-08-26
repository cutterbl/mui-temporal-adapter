import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

/**
 * These stories force `TemporalLocalizationProvider`'s two testing/demo-only flags (see its
 * own doc comment) via `parameters.temporal` — read by the global decorator in
 * `.storybook/preview.tsx` — to prove the lazy-loaded fallback paths work end to end in a
 * real running app, not just in the automated test suite.
 */
const meta = {
  title: 'How It Works/Lazy Polyfill Environment',
  component: DateCalendar,
  tags: ['autodocs'],
} satisfies Meta<typeof DateCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedPolyfill: Story = {
  parameters: {
    temporal: { forcePolyfill: true },
    docs: {
      description: {
        story:
          'Here we force lazy loading of the Temporal polyfill, to test that loading works as ' +
          "intended when needed. You won't do any of this yourself.",
      },
    },
  },
};

export const ForcedWeekInfoFallback: Story = {
  parameters: {
    temporal: { forceWeekInfoFallback: true },
    docs: {
      description: {
        story:
          'Here we force lazy loading of the first-day-of-week fallback, to test that loading ' +
          "works as intended when needed. You won't do any of this yourself.",
      },
    },
  },
};

export const BothForced: Story = {
  parameters: {
    temporal: { forcePolyfill: true, forceWeekInfoFallback: true },
    docs: {
      description: {
        story:
          'Here we force lazy loading of both polyfills at once, to test that loading works as ' +
          "intended when needed. You won't do any of this yourself.",
      },
    },
  },
};
