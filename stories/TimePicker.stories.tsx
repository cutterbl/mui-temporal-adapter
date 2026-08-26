import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

const meta = {
  title: 'Pickers/TimePicker',
  component: TimePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Pick a time' },
  parameters: {
    docs: {
      description: {
        story:
          'Just the time, no date — good for things like "what time should the alarm go off" ' +
          'where the day is already implied by context. Shows a 12-hour clock with AM/PM for ' +
          "locales that use one, and 24-hour otherwise, automatically, based on this story's " +
          'locale.',
      },
    },
  },
};

export const TwentyFourHour: Story = {
  args: { label: 'Heure', ampm: false },
  parameters: {
    docs: {
      description: {
        story:
          'Forcing a 24-hour clock with the `ampm` prop, regardless of what the current locale ' +
          'would normally use.',
      },
    },
  },
};
