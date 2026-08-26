import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests cover the native path: the runtime already supports
 * `Intl.Locale.prototype.getWeekInfo()`, so `ensureWeekInfo()` shouldn't
 * need to load anything, and `getFirstDayOfWeek()` should read straight
 * from the native API.
 *
 * Each test dynamically imports the modules under test after
 * `vi.resetModules()`, so the module-level `forced`/`fallbackTable` state
 * in `ensureWeekInfo.ts` always starts fresh — see the equivalent note in
 * the ensureTemporal tests for why this matters across a Vitest run.
 */
describe('week-info — native getWeekInfo available', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves first-day-of-week straight from the native API, with no loading needed', async () => {
    // `Intl.Locale.prototype.getWeekInfo` — verified false positive, see
    // `src/week-info/hasNativeGetWeekInfo.ts`'s doc comment.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(typeof Intl.Locale.prototype.getWeekInfo).toBe('function');

    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');

    // en-US starts the week on Sunday (7); fr-FR starts on Monday (1) —
    // per whatever the runtime's own CLDR data says, not our fallback table.
    expect(getFirstDayOfWeek('en-US')).toBe(new Intl.Locale('en-US').getWeekInfo().firstDay);
    expect(getFirstDayOfWeek('fr-FR')).toBe(new Intl.Locale('fr-FR').getWeekInfo().firstDay);
  });

  it('ensureWeekInfo() does not load the fallback table when native support exists', async () => {
    const ensureWeekInfoModule = await import('../../src/week-info/ensureWeekInfo');

    await ensureWeekInfoModule.ensureWeekInfo();

    expect(ensureWeekInfoModule.fallbackTable).toBeUndefined();
  });
});
