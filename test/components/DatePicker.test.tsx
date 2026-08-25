import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import createTemporalAdapter from '../../src/createTemporalAdapter';
import { renderWithAdapter } from './helpers/renderWithAdapter';

describe('DatePicker — real component + AdapterTemporal integration', () => {
  it('renders the keyboard-editable field sections from the initial value', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T00:00:00Z', 'UTC');

    await renderWithAdapter(<DatePicker value={value} label="Date" />, { adapterLocale: 'en-US' });

    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveAttribute('aria-valuenow', '15');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveAttribute('aria-valuenow', '2024');
  });

  it('fires onChange with an updated AdapterTemporal value when a field section is incremented', async () => {
    const user = userEvent.setup();
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T00:00:00Z', 'UTC');
    const onChange = vi.fn();

    await renderWithAdapter(<DatePicker value={value} onChange={onChange} label="Date" />, {
      adapterLocale: 'en-US',
    });

    const daySection = screen.getByRole('spinbutton', { name: 'Day' });
    await user.click(daySection);
    await user.keyboard('{ArrowUp}');

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0]![0] as Temporal.ZonedDateTime;
    expect(adapter.getDate(updated)).toBe(16);
    expect(adapter.getMonth(updated)).toBe(5); // unchanged (June, 0-based)
    expect(adapter.getYear(updated)).toBe(2024); // unchanged
  });

  it('opens the calendar and selects a day, firing onChange with the selected date', async () => {
    const user = userEvent.setup();
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T00:00:00Z', 'UTC');
    const onChange = vi.fn();

    await renderWithAdapter(<DatePicker value={value} onChange={onChange} label="Date" />, {
      adapterLocale: 'en-US',
    });

    await user.click(screen.getByLabelText(/Choose date/i));
    await user.click(screen.getByRole('gridcell', { name: '20' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selected = onChange.mock.calls[0]![0] as Temporal.ZonedDateTime;
    expect(adapter.getDate(selected)).toBe(20);
    expect(adapter.getMonth(selected)).toBe(5);
    expect(adapter.getYear(selected)).toBe(2024);
  });
});
