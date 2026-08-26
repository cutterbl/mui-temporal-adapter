import { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TemporalLocalizationProvider from '../src/TemporalLocalizationProvider';

/**
 * Reference/autodocs page for `TemporalLocalizationProvider` itself — every other story in
 * this book already demonstrates it in action (the global decorator in `.storybook/preview.tsx`
 * wraps every story in one), but none of them set `component: TemporalLocalizationProvider`, so
 * none produced a populated prop table for it. This file exists purely to give it that
 * reference page, straight from its own JSDoc — see `PLAN.md`'s Documentation section.
 */
const meta = {
  title: 'Setup/TemporalLocalizationProvider',
  component: TemporalLocalizationProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof TemporalLocalizationProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_SOURCE = `import { Suspense } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TemporalLocalizationProvider from '@cxing/mui-temporal-adapter/TemporalLocalizationProvider';

function App() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <TemporalLocalizationProvider>
        <DatePicker label="Pick a date" />
      </TemporalLocalizationProvider>
    </Suspense>
  );
}`;

export const Default: Story = {
  render: () => (
    <Suspense fallback={<p>Loading…</p>}>
      <TemporalLocalizationProvider>
        <DatePicker label="Pick a date" />
      </TemporalLocalizationProvider>
    </Suspense>
  ),
  parameters: {
    docs: {
      source: { code: DEFAULT_SOURCE },
      description: {
        story:
          'The convenience wrapper from the Getting Started guide — wrap it in `<Suspense>`, ' +
          'wrap your pickers in it, and every MUI X picker component underneath works with no ' +
          'further setup. This is the same component every other story in this book is already ' +
          'running underneath (via a global decorator), just shown here on its own with its ' +
          'full prop table.',
      },
    },
  },
};
