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
          "This one pretends your browser doesn't have Temporal built in yet, so you can watch " +
          'the automatic backup plan kick in. Everything below still works exactly the same — ' +
          "the calendar is running on the small backup copy of Temporal, not the browser's own " +
          "built-in version, and you'd never know the difference just by using it.",
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
          "This one pretends the browser doesn't know which day each region's calendar week " +
          'starts on (a separate, newer piece of browser support from Temporal itself), so you ' +
          'can watch the small built-in backup table take over instead. The calendar below ' +
          'still starts on the correct day for its locale.',
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
          'Both backup plans running at once — the least capable environment this package ' +
          'supports, and everything still works correctly.',
      },
    },
  },
};
