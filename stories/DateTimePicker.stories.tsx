import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const meta = {
  title: 'Pickers/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Pick a date and time' },
  parameters: {
    docs: {
      description: {
        story:
          'Date and time together, in one field — good for things like scheduling an ' +
          'appointment, where both matter.',
      },
    },
  },
};

export const InAFixedTimeZone: Story = {
  args: { label: 'Meeting (Tokyo time)', timezone: 'Asia/Tokyo' },
  parameters: {
    docs: {
      description: {
        story:
          "Pinning `timezone` to a specific IANA zone shows the value in *that* zone's local " +
          "time, no matter what timezone the visitor's own device is set to — see the " +
          '"Time Zones" guide in the Docs sidebar for the full explanation.',
      },
    },
  },
};
