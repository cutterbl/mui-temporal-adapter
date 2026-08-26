import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — arithmetic', () => {
  let adapter: AdapterTemporal;

  beforeAll(async () => {
    adapter = await buildAdapter({ locale: 'en-US' });
  });

  it('addDays / addWeeks add straightforwardly, including negative amounts', () => {
    const base = adapter.date('2024-06-15T00:00:00Z', 'UTC');
    expect(adapter.formatByString(adapter.addDays(base, 5), 'yyyy-MM-dd')).toBe('2024-06-20');
    expect(adapter.formatByString(adapter.addDays(base, -20), 'yyyy-MM-dd')).toBe('2024-05-26');
    expect(adapter.formatByString(adapter.addWeeks(base, 2), 'yyyy-MM-dd')).toBe('2024-06-29');
  });

  it('addHours / addMinutes / addSeconds add straightforwardly, including negative amounts', () => {
    const base = adapter.date('2024-06-15T10:30:15Z', 'UTC');
    expect(adapter.formatByString(adapter.addHours(base, 15), 'yyyy-MM-dd HH:mm:ss')).toBe(
      '2024-06-16 01:30:15',
    );
    expect(adapter.formatByString(adapter.addMinutes(base, 45), 'HH:mm:ss')).toBe('11:15:15');
    expect(adapter.formatByString(adapter.addSeconds(base, -20), 'HH:mm:ss')).toBe('10:29:55');
  });

  it('addMonths constrains to the last valid day of the resulting month', () => {
    // Jan 31 + 1 month -> Feb has no 31st; 2024 is a leap year, so it constrains to 29.
    const jan31 = adapter.date('2024-01-31T00:00:00Z', 'UTC');
    expect(adapter.formatByString(adapter.addMonths(jan31, 1), 'yyyy-MM-dd')).toBe('2024-02-29');
  });

  it('addYears constrains Feb 29 to Feb 28 when the target year is not a leap year', () => {
    const feb29 = adapter.date('2024-02-29T00:00:00Z', 'UTC');
    expect(adapter.formatByString(adapter.addYears(feb29, 1), 'yyyy-MM-dd')).toBe('2025-02-28');
  });

  it('negative amounts subtract', () => {
    const base = adapter.date('2024-06-15T00:00:00Z', 'UTC');
    expect(adapter.formatByString(adapter.addMonths(base, -6), 'yyyy-MM-dd')).toBe('2023-12-15');
    expect(adapter.formatByString(adapter.addYears(base, -1), 'yyyy-MM-dd')).toBe('2023-06-15');
  });
});
