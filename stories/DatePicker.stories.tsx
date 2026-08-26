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

// A range within a single month — narrow enough to see every disabled day without having to
// navigate the calendar popup at all.
const minDate = Temporal.PlainDate.from('2026-03-05').toZonedDateTime('UTC');
const maxDate = Temporal.PlainDate.from('2026-03-25').toZonedDateTime('UTC');

function ControlledDatePickerWithRange() {
  // A fixed starting date (not "now") that already falls inside minDate/maxDate, so the popup
  // opens already showing the very month the range restricts.
  const [value, setValue] = useState(() =>
    Temporal.PlainDate.from('2026-03-15').toZonedDateTime('UTC'),
  );

  return (
    <DatePicker
      label="Pick a date in March 2026"
      value={value}
      onChange={(newValue) => newValue && setValue(newValue)}
      minDate={minDate}
      maxDate={maxDate}
    />
  );
}`;

// A range within a single month — narrow enough to see every disabled day without having to
// navigate the calendar popup at all.
const minDate = Temporal.PlainDate.from('2026-03-05').toZonedDateTime('UTC');
const maxDate = Temporal.PlainDate.from('2026-03-25').toZonedDateTime('UTC');

/** Backs the `WithMinAndMaxDate` story below — see `DefaultDemo`'s doc comment for why this is
 * a named component rather than an inline arrow function. */
function WithMinAndMaxDateDemo() {
  // A fixed starting date (not "now") that already falls inside minDate/maxDate, so the popup
  // opens already showing the very month the range restricts.
  const [value, setValue] = useState(() =>
    Temporal.PlainDate.from('2026-03-15').toZonedDateTime('UTC'),
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <DatePicker
        label="Pick a date in March 2026"
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
          'March 5–25, 2026. The range is deliberately narrow (inside one month, with a fixed ' +
          'starting `value` that already falls inside it) so opening the calendar immediately ' +
          'shows disabled days at both ends, with no need to navigate months to see the effect. ' +
          '`value` is still live, controlled state — the same pattern as the default story above.',
      },
    },
  },
};
