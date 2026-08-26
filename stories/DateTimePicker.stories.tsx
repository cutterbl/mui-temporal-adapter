import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

/**
 * Every story below is a genuinely **controlled** component — `value` is real, live
 * `Temporal.ZonedDateTime` state, updated via `onChange`. See `DatePicker.stories.tsx`'s own
 * top-of-file note for why `parameters.docs.source.code` is set explicitly per story.
 */
const meta = {
  title: 'Pickers/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_SOURCE = `import { useState } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

function ControlledDateTimePicker() {
  // Real, live Temporal.ZonedDateTime state — this is a controlled component.
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());

  return (
    <DateTimePicker
      label="Pick a date and time"
      value={value}
      onChange={(newValue) => newValue && setValue(newValue)}
    />
  );
}`;

/** Backs the `Default` story below — a named component so `react-hooks/rules-of-hooks` (and
 * React itself) recognize it as a real component, not an anonymous callback. */
function DefaultDemo() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <DateTimePicker
        label="Pick a date and time"
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
      />
      <p>
        Current value: <code>{value.toString()}</code>
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
  parameters: {
    docs: {
      source: { code: DEFAULT_SOURCE },
      description: {
        story:
          'Date and time together, in one field — good for things like scheduling an ' +
          'appointment, where both matter. Wired as a controlled component; the full live ' +
          '`Temporal.ZonedDateTime` value (including its time zone) is shown below the field.',
      },
    },
  },
};

const FIXED_ZONE_SOURCE = `import { useState } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

function ControlledDateTimePickerInTokyo() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO('Asia/Tokyo'));

  return (
    <DateTimePicker
      label="Meeting (Tokyo time)"
      timezone="Asia/Tokyo"
      value={value}
      onChange={(newValue) => newValue && setValue(newValue)}
    />
  );
}`;

/** Backs the `InAFixedTimeZone` story below — see `DefaultDemo`'s doc comment for why this is
 * a named component rather than an inline arrow function. */
function InAFixedTimeZoneDemo() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO('Asia/Tokyo'));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <DateTimePicker
        label="Meeting (Tokyo time)"
        timezone="Asia/Tokyo"
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
      />
      <p>
        Current value: <code>{value.toString()}</code>
      </p>
    </div>
  );
}

export const InAFixedTimeZone: Story = {
  render: () => <InAFixedTimeZoneDemo />,
  parameters: {
    docs: {
      source: { code: FIXED_ZONE_SOURCE },
      description: {
        story:
          "Pinning `timezone` to a specific IANA zone shows the value in *that* zone's local " +
          "time, no matter what timezone the visitor's own device is set to — notice the " +
          'controlled value below the field always carries the `Asia/Tokyo` zone, even as you ' +
          'change it. See the "Time Zones" guide in the Docs sidebar for the full explanation.',
      },
    },
  },
};
