import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests simulate a runtime with no `Intl.Locale.prototype.getWeekInfo`
 * support at all — proving `ensureWeekInfo()` lazily loads the fallback
 * table, and that `getFirstDayOfWeek()` then resolves correctly from it.
 */
describe('week-info — no native getWeekInfo support', () => {
  // `Intl.Locale.prototype.getWeekInfo` resolves to `any` in typescript-eslint's checker
  // specifically for `.prototype` access under TS 6.x's `esnext.intl` lib — a verified false
  // positive (`tsc` itself resolves the real, non-`any` `WeekInfo`-returning type correctly);
  // see `src/week-info/hasNativeGetWeekInfo.ts`'s doc comment for the full explanation.
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- see above */
  const originalGetWeekInfo = Intl.Locale.prototype.getWeekInfo;

  beforeEach(() => {
    vi.resetModules();
    // Intentionally simulating an environment without this method.
    delete Intl.Locale.prototype.getWeekInfo;
  });

  afterEach(() => {
    Intl.Locale.prototype.getWeekInfo = originalGetWeekInfo;
  });
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

  it('lazily loads the fallback table and resolves correctly from it', async () => {
    const { ensureWeekInfo } = await import('../../src/week-info/ensureWeekInfo');
    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');

    await ensureWeekInfo();

    // Known table entries: en-US -> Sunday (7), fr-FR -> Monday (1, the default).
    expect(getFirstDayOfWeek('en-US')).toBe(7);
    expect(getFirstDayOfWeek('fr-FR')).toBe(1);
    // A well-formed locale whose region isn't in the table at all still
    // gets the sensible Monday default, not a crash.
    expect(getFirstDayOfWeek('en-GB')).toBe(1);
  });

  it('resolves a safe default if called before ensureWeekInfo() has loaded the table', async () => {
    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');

    // ensureWeekInfo() was never called in this fresh module instance.
    expect(getFirstDayOfWeek('en-US')).toBe(1);
  });

  it('a locale tag whose maximize() yields no region still resolves the safe default', async () => {
    const { ensureWeekInfo } = await import('../../src/week-info/ensureWeekInfo');
    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');
    await ensureWeekInfo();

    // 'zxx' ("no linguistic content", ISO 639-2) has no likely-subtag region to fill in.
    expect(new Intl.Locale('zxx').maximize().region).toBeUndefined();
    expect(getFirstDayOfWeek('zxx')).toBe(1);
  });

  it('a second ensureWeekInfo() call is a cheap no-op once the table is already loaded', async () => {
    const { ensureWeekInfo } = await import('../../src/week-info/ensureWeekInfo');
    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');

    await ensureWeekInfo();
    await ensureWeekInfo(); // exercises the already-loaded early-return path
    expect(getFirstDayOfWeek('en-US')).toBe(7);
  });
});

describe('week-info — forced fallback even with native support present', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses the fallback table and never touches the native method when forced', async () => {
    // `Intl.Locale.prototype.getWeekInfo` — verified false positive, see
    // `src/week-info/hasNativeGetWeekInfo.ts`'s doc comment.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(typeof Intl.Locale.prototype.getWeekInfo).toBe('function');

    const { ensureWeekInfo } = await import('../../src/week-info/ensureWeekInfo');
    const { getFirstDayOfWeek } = await import('../../src/week-info/getFirstDayOfWeek');

    // Stub the native method to prove it's never called on the forced path —
    // if getFirstDayOfWeek fell through to native despite forcing, this
    // would throw and fail the test.
    const nativeSpy = vi.spyOn(Intl.Locale.prototype, 'getWeekInfo').mockImplementation(() => {
      throw new Error('native getWeekInfo should not be called when forced');
    });

    await ensureWeekInfo({ force: true });

    expect(getFirstDayOfWeek('en-US')).toBe(7);
    expect(nativeSpy).not.toHaveBeenCalled();
  });
});
