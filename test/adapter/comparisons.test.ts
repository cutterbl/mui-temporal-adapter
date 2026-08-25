import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — comparisons', () => {
  let adapter: AdapterTemporal;

  beforeAll(async () => {
    adapter = await buildAdapter({ locale: 'en-US' });
  });

  describe('isEqual', () => {
    it('treats two null values as equal, and one null / one not as unequal', () => {
      expect(adapter.isEqual(null, null)).toBe(true);
      const v = adapter.date('2024-06-15T00:00:00Z', 'UTC');
      expect(adapter.isEqual(v, null)).toBe(false);
      expect(adapter.isEqual(null, v)).toBe(false);
    });

    it('compares the underlying instant, independent of which zone each value is expressed in', () => {
      const value = adapter.date('2024-06-15T10:00:00Z', 'UTC');
      const sameInstantElsewhere = adapter.setTimezone(value, 'Asia/Tokyo');
      expect(adapter.isEqual(value, sameInstantElsewhere)).toBe(true);

      const differentInstant = adapter.date('2024-06-15T10:00:01Z', 'UTC');
      expect(adapter.isEqual(value, differentInstant)).toBe(false);
    });
  });

  describe('isSameYear / isSameMonth / isSameDay / isSameHour', () => {
    it('report true when every relevant field matches', () => {
      const value = adapter.date('2024-06-15T10:30:00Z', 'UTC');
      const comparing = adapter.date('2024-06-15T10:45:00Z', 'UTC'); // same hour, different minute
      expect(adapter.isSameYear(value, comparing)).toBe(true);
      expect(adapter.isSameMonth(value, comparing)).toBe(true);
      expect(adapter.isSameDay(value, comparing)).toBe(true);
      expect(adapter.isSameHour(value, comparing)).toBe(true);
    });

    it('report false as soon as a relevant field diverges', () => {
      const value = adapter.date('2024-06-15T10:30:00Z', 'UTC');
      expect(adapter.isSameYear(value, adapter.date('2025-06-15T10:30:00Z', 'UTC'))).toBe(false);
      expect(adapter.isSameMonth(value, adapter.date('2024-07-15T10:30:00Z', 'UTC'))).toBe(false);
      expect(adapter.isSameDay(value, adapter.date('2024-06-16T10:30:00Z', 'UTC'))).toBe(false);
      expect(adapter.isSameHour(value, adapter.date('2024-06-15T11:30:00Z', 'UTC'))).toBe(false);
    });

    it('project `comparing` into the *reference* date\'s own timezone, not its own', () => {
      // value: 2024-06-16T00:30:00+09:00[Asia/Tokyo] == instant 2024-06-15T15:30:00Z.
      // Tokyo has no DST, so its offset is a fixed +09:00 year-round — safe to hardcode.
      const value = adapter.date('2024-06-16T00:30:00+09:00', 'Asia/Tokyo');

      // comparing: 2024-06-15T20:00:00Z — a *different* instant, whose own UTC calendar day
      // is June 15. Reprojected into `value`'s zone (Tokyo, +09:00) it becomes
      // 2024-06-16T05:00, i.e. June 16 — the same day as `value` — even though `comparing`'s
      // own zone would call it June 15. This is what "uses the reference date's timezone"
      // means in practice.
      const comparingSameDayInReferenceZone = adapter.date('2024-06-15T20:00:00Z', 'UTC');
      expect(adapter.isSameDay(value, comparingSameDayInReferenceZone)).toBe(true);

      // comparing2: 2024-06-14T20:00:00Z reprojects into Tokyo as 2024-06-15T05:00 — June 15,
      // a genuinely different day from `value`'s June 16.
      const comparingDifferentDayInReferenceZone = adapter.date('2024-06-14T20:00:00Z', 'UTC');
      expect(adapter.isSameDay(value, comparingDifferentDayInReferenceZone)).toBe(false);
    });
  });

  describe('isAfter / isBefore (instant)', () => {
    it('compare the raw instant', () => {
      const earlier = adapter.date('2024-06-15T10:00:00Z', 'UTC');
      const later = adapter.date('2024-06-15T10:00:01Z', 'UTC');
      expect(adapter.isAfter(later, earlier)).toBe(true);
      expect(adapter.isAfter(earlier, later)).toBe(false);
      expect(adapter.isBefore(earlier, later)).toBe(true);
      expect(adapter.isBefore(later, earlier)).toBe(false);
    });
  });

  describe('isAfterYear / isBeforeYear', () => {
    it('compare only the year, in the reference date\'s timezone', () => {
      const value = adapter.date('2024-06-15T00:00:00Z', 'UTC');
      const laterYear = adapter.date('2025-01-01T00:00:00Z', 'UTC');
      const earlierYear = adapter.date('2023-12-31T00:00:00Z', 'UTC');
      expect(adapter.isAfterYear(value, earlierYear)).toBe(true);
      expect(adapter.isAfterYear(value, laterYear)).toBe(false);
      expect(adapter.isBeforeYear(value, laterYear)).toBe(true);
      expect(adapter.isBeforeYear(value, earlierYear)).toBe(false);
    });
  });

  describe('isAfterDay / isBeforeDay', () => {
    it('compare only the calendar day, ignoring time-of-day', () => {
      const value = adapter.date('2024-06-15T23:00:00Z', 'UTC');
      const sameDayEarlierTime = adapter.date('2024-06-15T01:00:00Z', 'UTC');
      const nextDay = adapter.date('2024-06-16T00:00:01Z', 'UTC');
      const previousDay = adapter.date('2024-06-14T23:59:59Z', 'UTC');

      expect(adapter.isAfterDay(value, sameDayEarlierTime)).toBe(false);
      expect(adapter.isBeforeDay(value, sameDayEarlierTime)).toBe(false);
      expect(adapter.isBeforeDay(value, nextDay)).toBe(true);
      expect(adapter.isAfterDay(value, previousDay)).toBe(true);
    });
  });

  describe('isWithinRange', () => {
    it('is inclusive of both range endpoints', () => {
      const start = adapter.date('2024-06-01T00:00:00Z', 'UTC');
      const end = adapter.date('2024-06-30T00:00:00Z', 'UTC');
      const inside = adapter.date('2024-06-15T00:00:00Z', 'UTC');
      const before = adapter.date('2024-05-31T00:00:00Z', 'UTC');
      const after = adapter.date('2024-07-01T00:00:00Z', 'UTC');

      expect(adapter.isWithinRange(start, [start, end])).toBe(true);
      expect(adapter.isWithinRange(end, [start, end])).toBe(true);
      expect(adapter.isWithinRange(inside, [start, end])).toBe(true);
      expect(adapter.isWithinRange(before, [start, end])).toBe(false);
      expect(adapter.isWithinRange(after, [start, end])).toBe(false);
    });
  });
});
