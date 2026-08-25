import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests simulate a runtime with no `Intl.Locale.prototype.getWeekInfo`
 * support at all — proving `ensureWeekInfo()` lazily loads the fallback
 * table, and that `getFirstDayOfWeek()` then resolves correctly from it.
 */
describe('week-info — no native getWeekInfo support', () => {
  const originalGetWeekInfo = Intl.Locale.prototype.getWeekInfo;

  beforeEach(() => {
    vi.resetModules();
    // Intentionally simulating an environment without this method.
    delete Intl.Locale.prototype.getWeekInfo;
  });

  afterEach(() => {
    Intl.Locale.prototype.getWeekInfo = originalGetWeekInfo;
  });

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
});

describe('week-info — forced fallback even with native support present', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses the fallback table and never touches the native method when forced', async () => {
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
