import { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import TemporalLocalizationProvider from '../src/TemporalLocalizationProvider';

/**
 * A small demo-only wrapper component (not part of this package's public API) whose
 * `locale` prop, unlike a `parameters`-based approach, can be driven live by Storybook's
 * Controls panel — letting a reader switch locales and immediately see the calendar
 * re-render with that locale's own first day of the week.
 */
function LocaleWeekStartDemo({ locale }: { locale: string }) {
  return (
    <Suspense fallback={<p>Loading the Temporal adapter…</p>}>
      <TemporalLocalizationProvider adapterLocale={locale}>
        <DateCalendar />
      </TemporalLocalizationProvider>
    </Suspense>
  );
}

const meta = {
  title: 'Locales/First Day of the Week',
  component: LocaleWeekStartDemo,
  tags: ['autodocs'],
  argTypes: {
    locale: {
      control: 'select',
      options: ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'ja-JP', 'ar-SA'],
    },
  },
} satisfies Meta<typeof LocaleWeekStartDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwitchLocale: Story = {
  args: { locale: 'en-US' },
  parameters: {
    docs: {
      description: {
        story:
          'Use the Controls panel below to switch the locale and watch which day the calendar ' +
          "starts its week on — Sunday for en-US, Monday for most of Europe, and so on. That's " +
          "each locale's own convention, not something a developer using this package configures " +
          'by hand — see the "Locales & First Day of the Week" guide in the Docs sidebar.',
      },
    },
  },
};
