import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import createTemporalAdapter from '../../src/createTemporalAdapter';
import { renderWithAdapter } from './helpers/renderWithAdapter';

describe('TimePicker — real component + AdapterTemporal integration', () => {
  it('renders the keyboard-editable field sections from the initial value, 12-hour cycle for en-US', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'en-US' });
    const value = adapter.date('2024-06-15T14:05:00Z', 'UTC');

    await renderWithAdapter(<TimePicker value={value} label="Time" />, { adapterLocale: 'en-US' });

    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveAttribute('aria-valuenow', '5');
    expect(screen.getByRole('spinbutton', { name: 'Meridiem' })).toHaveTextContent('PM');
  });

  it('renders a 24-hour cycle for fr-FR, with no meridiem section', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'fr-FR' });
    const value = adapter.date('2024-06-15T14:05:00Z', 'UTC');

    await renderWithAdapter(<TimePicker value={value} label="Heure" />, { adapterLocale: 'fr-FR' });

    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('aria-valuenow', '14');
    expect(screen.queryByRole('spinbutton', { name: 'Meridiem' })).not.toBeInTheDocument();
  });
});
