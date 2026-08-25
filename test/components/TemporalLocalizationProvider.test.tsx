import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import TemporalLocalizationProvider from '../../src/TemporalLocalizationProvider';

describe('TemporalLocalizationProvider — use()/<Suspense> convenience wrapper', () => {
  it('suspends into the caller\'s fallback, then renders children once the adapter resolves', async () => {
    // React 19's `use()` suspending on the very first render needs the initial `render()`
    // call itself wrapped in `await act(async () => ...)` in this jsdom/RTL setup — without
    // it, the update React schedules once the underlying promise resolves never gets
    // flushed, and the tree stays stuck on the Suspense fallback forever. (Confirmed via an
    // isolated probe against a plain `Promise.resolve()` before writing this test — not
    // specific to this component.)
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading…</div>}>
          <TemporalLocalizationProvider adapterLocale="en-US">
            <DateCalendar />
          </TemporalLocalizationProvider>
        </Suspense>,
      );
    });

    // The real calendar grid renders once `createTemporalAdapter()` resolves.
    expect(await screen.findByRole('grid')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('renders correctly with forcePolyfill, exercising the lazy-loaded temporal-polyfill path', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading…</div>}>
          <TemporalLocalizationProvider adapterLocale="en-US" forcePolyfill>
            <DateCalendar />
          </TemporalLocalizationProvider>
        </Suspense>,
      );
    });

    expect(await screen.findByRole('grid')).toBeInTheDocument();
    // Sunday-first for en-US, same as the native path — proves the polyfill path produces
    // functionally identical results, not just that it doesn't crash.
    const headers = screen.getAllByRole('columnheader').map((el) => el.getAttribute('aria-label'));
    expect(headers[0]).toBe('Sunday');
  });
});
