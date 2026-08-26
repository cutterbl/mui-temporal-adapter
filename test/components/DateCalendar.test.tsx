import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import createTemporalAdapter from '../../src/createTemporalAdapter';
import { renderWithAdapter } from './helpers/renderWithAdapter';

/**
 * Every weekday-column header's `aria-label`, in the order MUI renders them for a given
 * locale/first-day-of-week — computed independently of this package's own code, straight
 * from a plain `Intl` call, as the ground truth to compare the rendered DOM against. Module
 * scope so both `describe` blocks below can share it.
 */
function expectedWeekdayHeaderLabels(locale: string, firstDay: number): string[] {
  // 2023-01-01T00:00:00Z is a Sunday.
  const names = Array.from({ length: 7 }, (_unused, i) =>
    new Date(Date.UTC(2023, 0, 1 + i)).toLocaleString(locale, { weekday: 'long', timeZone: 'UTC' }),
  );
  const startIndex = firstDay % 7; // ISO 7 (Sunday) -> 0, 1 (Monday) -> 1, etc.
  // `names` always has exactly 7 entries and `(startIndex + i) % 7` always lands in range —
  // the non-null assertion is just satisfying `noUncheckedIndexedAccess`, never a real gap.
  return Array.from({ length: 7 }, (_unused, i) => names[(startIndex + i) % 7]!);
}

/**
 * Verifies the calendar grid MUI X actually renders reflects `AdapterTemporal`'s own
 * locale-aware week semantics (`startOfWeek`/`getWeekArray`/`getDayOfWeek`, all unit-tested
 * directly in `test/adapter/week.test.ts`) — not re-deriving that math again here, but
 * confirming the picker component's rendered DOM genuinely uses it.
 */
describe('DateCalendar — locale-aware week-start ordering', () => {
  it('renders Sunday-first for en-US', async () => {
    await renderWithAdapter(<DateCalendar />, { adapterLocale: 'en-US' });

    const headers = screen.getAllByRole('columnheader').map((el) => el.getAttribute('aria-label'));
    const firstDay = new Intl.Locale('en-US').getWeekInfo().firstDay;
    expect(headers).toEqual(expectedWeekdayHeaderLabels('en-US', firstDay));
    expect(headers[0]).toBe('Sunday'); // en-US's own weekday names happen to be in English
  });

  it('renders Monday-first for fr-FR', async () => {
    await renderWithAdapter(<DateCalendar />, { adapterLocale: 'fr-FR' });

    const headers = screen.getAllByRole('columnheader').map((el) => el.getAttribute('aria-label'));
    const firstDay = new Intl.Locale('fr-FR').getWeekInfo().firstDay;
    expect(headers).toEqual(expectedWeekdayHeaderLabels('fr-FR', firstDay));
    // firstDay 1 == Monday, expressed in fr-FR's own weekday names ("lundi").
    expect(headers[0]).toBe(expectedWeekdayHeaderLabels('fr-FR', 1)[0]);
  });

  it("positions the 1st of the month in the grid column matching the locale's first day of the week", async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass({ locale: 'fr-FR' });
    // June 1 2024 is a Saturday (ISO dayOfWeek 6); fr-FR's week starts Monday (firstDay 1),
    // so the 1st should land in column ((6 - 1 + 7) % 7) + 1 = 6.
    const referenceDate = adapter.date('2024-06-15T00:00:00Z', 'UTC');

    await renderWithAdapter(<DateCalendar referenceDate={referenceDate} />, {
      adapterLocale: 'fr-FR',
    });

    const dayButtons = screen
      .getAllByRole('gridcell')
      .filter((el) => el.hasAttribute('data-timestamp'));
    const firstDayButton = dayButtons[0]!;
    expect(firstDayButton).toHaveTextContent('1');
    expect(firstDayButton.getAttribute('aria-colindex')).toBe('6');
  });
});

/**
 * Same assertions as above, but with `forceWeekInfoFallback: true` — proving the lazily
 * loaded static fallback table (see `src/week-info/firstDayOfWeekTable.ts`) produces the
 * same locale-correct calendar grid as native `Intl.Locale#getWeekInfo()` does, end to end
 * through a real rendered component, not just via the `week-info` unit tests.
 *
 * Kept in its own `describe`/file-adjacent test (rather than mixed into the block above) —
 * `ensureWeekInfo()`'s `force` flag is sticky for the rest of this test file's module
 * lifetime once set (by design, see its own doc comment), so a forced test running before an
 * unforced one in the same file would silently contaminate it.
 */
describe('DateCalendar — forceWeekInfoFallback', () => {
  it('still renders Monday-first for fr-FR via the fallback table', async () => {
    await renderWithAdapter(<DateCalendar />, {
      adapterLocale: 'fr-FR',
      forceWeekInfoFallback: true,
    });

    const headers = screen.getAllByRole('columnheader').map((el) => el.getAttribute('aria-label'));
    expect(headers).toEqual(expectedWeekdayHeaderLabels('fr-FR', 1)); // fr-FR is Monday-first
  });
});
