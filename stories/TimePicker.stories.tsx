import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

/**
 * Every story below is a genuinely **controlled** component — `value` is real, live
 * `Temporal.ZonedDateTime` state, updated via `onChange`. See `DatePicker.stories.tsx`'s own
 * top-of-file note for why `parameters.docs.source.code` is set explicitly per story.
 */
const meta = {
  title: 'Pickers/TimePicker',
  component: TimePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_SOURCE = `import { useState } from 'react';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

function ControlledTimePicker() {
  // Real, live Temporal.ZonedDateTime state — this is a controlled component.
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());

  return (
    <TimePicker
      label="Pick a time"
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
      <TimePicker
        label="Pick a time"
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
      />
      <p>
        Current value:{' '}
        <code>
          {String(value.hour).padStart(2, '0')}:{String(value.minute).padStart(2, '0')}
        </code>
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
          'Just the time, no date — good for things like "what time should the alarm go off" ' +
          'where the day is already implied by context. Wired as a controlled component; the ' +
          'current time is shown live below the field. Shows a 12-hour clock with AM/PM for ' +
          "locales that use one, and 24-hour otherwise, automatically, based on this story's " +
          'locale.',
      },
    },
  },
};

const TWENTY_FOUR_HOUR_SOURCE = `import { useState } from 'react';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

function ControlledTwentyFourHourTimePicker() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());

  return (
    <TimePicker
      label="Heure"
      ampm={false}
      value={value}
      onChange={(newValue) => newValue && setValue(newValue)}
    />
  );
}`;

/** Backs the `TwentyFourHour` story below — see `DefaultDemo`'s doc comment for why this is a
 * named component rather than an inline arrow function. */
function TwentyFourHourDemo() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <TimePicker
        label="Heure"
        ampm={false}
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
      />
      <p>
        Current value:{' '}
        <code>
          {String(value.hour).padStart(2, '0')}:{String(value.minute).padStart(2, '0')}
        </code>
      </p>
    </div>
  );
}

export const TwentyFourHour: Story = {
  render: () => <TwentyFourHourDemo />,
  parameters: {
    docs: {
      source: { code: TWENTY_FOUR_HOUR_SOURCE },
      description: {
        story:
          'Forcing a 24-hour clock with the `ampm` prop, regardless of what the current locale ' +
          'would normally use. `value` is still live, controlled state.',
      },
    },
  },
};
