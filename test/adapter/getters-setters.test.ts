import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — getters/setters', () => {
  let adapter: AdapterTemporal;

  beforeAll(async () => {
    adapter = await buildAdapter({ locale: 'en-US' });
  });

  describe('getters', () => {
    it('reads every field off a known fixture (built in UTC, so reads are host-timezone-independent)', () => {
      const v = adapter.date('2024-03-15T09:08:07.006Z', 'UTC');
      expect(adapter.getYear(v)).toBe(2024);
      expect(adapter.getMonth(v)).toBe(2); // 0-based: March
      expect(adapter.getDate(v)).toBe(15);
      expect(adapter.getHours(v)).toBe(9);
      expect(adapter.getMinutes(v)).toBe(8);
      expect(adapter.getSeconds(v)).toBe(7);
      expect(adapter.getMilliseconds(v)).toBe(6);
    });
  });

  describe('setters', () => {
    it('sets each field independently, leaving the others untouched', () => {
      const base = adapter.date('2024-03-15T09:08:07.006Z', 'UTC');

      expect(adapter.getYear(adapter.setYear(base, 2030))).toBe(2030);
      expect(adapter.getMonth(adapter.setMonth(base, 0))).toBe(0); // January
      expect(adapter.getDate(adapter.setMonth(base, 0))).toBe(15); // day untouched
      expect(adapter.getDate(adapter.setDate(base, 1))).toBe(1);
      expect(adapter.getHours(adapter.setHours(base, 23))).toBe(23);
      expect(adapter.getMinutes(adapter.setMinutes(base, 59))).toBe(59);
      expect(adapter.getSeconds(adapter.setSeconds(base, 59))).toBe(59);
      expect(adapter.getMilliseconds(adapter.setMilliseconds(base, 999))).toBe(999);
    });

    it('setMonth constrains the day to the last valid day of the resulting month', () => {
      // Jan 31 -> February has no 31st; 2024 is a leap year, so it constrains to 29, not 28.
      const jan31 = adapter.date('2024-01-31T00:00:00Z', 'UTC');
      const constrained = adapter.setMonth(jan31, 1); // February, 0-based
      expect(adapter.getMonth(constrained)).toBe(1);
      expect(adapter.getDate(constrained)).toBe(29);
    });

    it('setYear constrains Feb 29 to Feb 28 when the new year is not a leap year', () => {
      const feb29 = adapter.date('2024-02-29T00:00:00Z', 'UTC');
      const constrained = adapter.setYear(feb29, 2023);
      expect(adapter.getYear(constrained)).toBe(2023);
      expect(adapter.getMonth(constrained)).toBe(1);
      expect(adapter.getDate(constrained)).toBe(28);
    });

    it('setDate constrains an out-of-range day to the month\'s last valid day', () => {
      const apr = adapter.date('2024-04-15T00:00:00Z', 'UTC'); // April has 30 days
      const constrained = adapter.setDate(apr, 31);
      expect(adapter.getDate(constrained)).toBe(30);
    });
  });
});
