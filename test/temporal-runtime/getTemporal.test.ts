import { describe, expect, it } from 'vitest';
import { getTemporal } from '../../src/temporal-runtime/getTemporal';
import { ensureTemporal } from '../../src/temporal-runtime/ensureTemporal';

describe('getTemporal', () => {
  it('throws a descriptive error when called before Temporal has been made available', () => {
    // This test file's module registry hasn't called `ensureTemporal()` yet, and this
    // runtime has no native `Temporal` global (confirmed project-wide — see DECISIONS.md) —
    // so `getTemporal()` should throw its documented "did you forget to await
    // createTemporalAdapter()" error rather than return.
    expect(() => getTemporal()).toThrow(/createTemporalAdapter/);
  });

  it('returns the ambient Temporal global once ensureTemporal() has resolved', async () => {
    await ensureTemporal();
    expect(getTemporal()).toBe(globalThis.Temporal);
    expect(typeof getTemporal().Now.zonedDateTimeISO).toBe('function');
  });
});
