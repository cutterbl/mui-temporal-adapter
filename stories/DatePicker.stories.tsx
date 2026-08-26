import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const meta = {
  title: 'Pickers/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Pick a date' },
  parameters: {
    docs: {
      description: {
        story:
          'The everyday date picker. Click the calendar icon to open a popup calendar, or click ' +
          'straight into the field and type a date. Try the arrow keys once a field section is ' +
          'focused, too.',
      },
    },
  },
};

export const WithMinAndMaxDate: Story = {
  args: {
    label: 'Pick a date in 2026',
    minDate: Temporal.PlainDate.from('2026-01-01').toZonedDateTime('UTC'),
    maxDate: Temporal.PlainDate.from('2026-12-31').toZonedDateTime('UTC'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Reach for `minDate`/`maxDate` when only some dates should be pickable — here, only ' +
          '2026. Dates outside the range are shown but disabled in the calendar popup.',
      },
    },
  },
};
