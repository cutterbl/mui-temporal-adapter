import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import TemporalLocalizationProvider from '../../src/TemporalLocalizationProvider';

/**
 * Kept in its own file — see `DateCalendar.test.tsx`'s note on why `forceWeekInfoFallback`
 * tests can't safely share a module registry with unforced ones.
 */
describe('TemporalLocalizationProvider — forceWeekInfoFallback', () => {
  it('still renders a correct, locale-appropriate calendar grid via the fallback table', async () => {
    // See `TemporalLocalizationProvider.test.tsx` for why the initial render is wrapped in
    // `await act(async () => ...)` here.
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading…</div>}>
          <TemporalLocalizationProvider adapterLocale="fr-FR" forceWeekInfoFallback>
            <DateCalendar />
          </TemporalLocalizationProvider>
        </Suspense>,
      );
    });

    expect(await screen.findByRole('grid')).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((el) => el.getAttribute('aria-label'));
    // fr-FR's own weekday names, Monday-first ("lundi" first, "dimanche" last).
    const mondayName = new Date(Date.UTC(2023, 0, 2)).toLocaleString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
    const sundayName = new Date(Date.UTC(2023, 0, 1)).toLocaleString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
    expect(headers[0]).toBe(mondayName);
    expect(headers[6]).toBe(sundayName);
  });
});
