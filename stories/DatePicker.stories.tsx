import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/**
 * Every story below is a genuinely **controlled** component — `value` is real
 * `Temporal.ZonedDateTime`-backed `useState`, updated live via `onChange`, exactly as a
 * consuming app would wire it up. The "Show code" panel is pinned (via
 * `parameters.docs.source.code`) to the same idiomatic snippet shown inline here, rather than
 * a synthesized-from-args version that wouldn't show the actual state wiring.
 */
const meta = {
  title: 'Pickers/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_SOURCE = `import { useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function ControlledDatePicker() {
  // Real, live Temporal.ZonedDateTime state — this is a controlled component.
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO());

  return (
    <DatePicker
      label="Pick a date"
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
      <DatePicker
        label="Pick a date"
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
      />
      <p>
        Current value: <code>{value.toPlainDate().toString()}</code>
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
          'The everyday date picker, wired as a controlled component — its value is real, live ' +
          '`Temporal.ZonedDateTime` state (shown below the field), updated on every change via ' +
          '`onChange`. Click the calendar icon to open a popup calendar, or click straight into ' +
          'the field and type a date.',
      },
    },
  },
};

const MIN_MAX_SOURCE = `import { useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const minDate = Temporal.PlainDate.from('2026-01-01').toZonedDateTime('UTC');
const maxDate = Temporal.PlainDate.from('2026-12-31').toZonedDateTime('UTC');

function ControlledDatePickerWithRange() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO('UTC'));

  return (
    <DatePicker
      label="Pick a date in 2026"
      value={value}
      onChange={(newValue) => newValue && setValue(newValue)}
      minDate={minDate}
      maxDate={maxDate}
    />
  );
}`;

const minDate = Temporal.PlainDate.from('2026-01-01').toZonedDateTime('UTC');
const maxDate = Temporal.PlainDate.from('2026-12-31').toZonedDateTime('UTC');

/** Backs the `WithMinAndMaxDate` story below — see `DefaultDemo`'s doc comment for why this is
 * a named component rather than an inline arrow function. */
function WithMinAndMaxDateDemo() {
  const [value, setValue] = useState(() => Temporal.Now.zonedDateTimeISO('UTC'));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <DatePicker
        label="Pick a date in 2026"
        value={value}
        onChange={(newValue) => newValue && setValue(newValue)}
        minDate={minDate}
        maxDate={maxDate}
      />
      <p>
        Current value: <code>{value.toPlainDate().toString()}</code>
      </p>
    </div>
  );
}

export const WithMinAndMaxDate: Story = {
  render: () => <WithMinAndMaxDateDemo />,
  parameters: {
    docs: {
      source: { code: MIN_MAX_SOURCE },
      description: {
        story:
          'Reach for `minDate`/`maxDate` when only some dates should be pickable — here, only ' +
          '2026. Dates outside the range are shown but disabled in the calendar popup. `value` ' +
          'is still live, controlled state — the same pattern as the default story above.',
      },
    },
  },
};
