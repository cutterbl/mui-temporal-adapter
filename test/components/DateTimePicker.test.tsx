import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import createTemporalAdapter from '../../src/createTemporalAdapter';
import { renderWithAdapter } from './helpers/renderWithAdapter';

describe('DateTimePicker — real component + AdapterTemporal integration', () => {
  it('renders both date and time field sections from the initial value', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T14:05:00Z', 'UTC');

    await renderWithAdapter(<DateTimePicker value={value} label="Appointment" />, { adapterLocale: 'en-US' });

    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveAttribute('aria-valuenow', '15');
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveAttribute('aria-valuenow', '5');
  });

  it('is timezone-aware: the same instant renders different local fields under a different timezone', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T23:30:00Z', 'UTC'); // 23:30 UTC -> next day in Tokyo

    await renderWithAdapter(<DateTimePicker value={value} timezone="Asia/Tokyo" label="Appointment" />, {
      adapterLocale: 'en-US',
    });

    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveAttribute('aria-valuenow', '16');
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '8'); // 23:30 UTC + 9h = 08:30 Tokyo
  });

  it('fires onChange with an updated value when a time section is incremented', async () => {
    const user = userEvent.setup();
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T14:05:00Z', 'UTC');
    const onChange = vi.fn();

    await renderWithAdapter(<DateTimePicker value={value} onChange={onChange} label="Appointment" />, {
      adapterLocale: 'en-US',
    });

    const minutesSection = screen.getByRole('spinbutton', { name: 'Minutes' });
    await user.click(minutesSection);
    await user.keyboard('{ArrowUp}');

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0]![0] as Temporal.ZonedDateTime;
    expect(adapter.getMinutes(updated)).toBe(6);
    expect(adapter.getHours(updated)).toBe(14);
    expect(adapter.getDate(updated)).toBe(15);
  });
});
