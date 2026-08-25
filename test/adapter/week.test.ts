import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — week helpers', () => {
  // Two locale-distinct adapters: en-US starts its week on Sunday, fr-FR on Monday — every
  // test below that cares about the locale's first day of the week uses whichever of these
  // makes the point, rather than re-deriving the locale's own week-info data by hand.
  let enUS: AdapterTemporal;
  let frFR: AdapterTemporal;

  beforeAll(async () => {
    enUS = await buildAdapter({ locale: 'en-US' });
    frFR = await buildAdapter({ locale: 'fr-FR' });
  });

  describe('startOfWeek / endOfWeek', () => {
    it('starts on Sunday for en-US and Monday for fr-FR', () => {
      // 2024-06-12 is a Wednesday.
      const wednesday = enUS.date('2024-06-12T15:00:00Z', 'UTC');

      expect(enUS.formatByString(enUS.startOfWeek(wednesday), 'yyyy-MM-dd')).toBe('2024-06-09'); // Sunday
      expect(enUS.formatByString(enUS.endOfWeek(wednesday), 'yyyy-MM-dd')).toBe('2024-06-15'); // Saturday

      const wednesdayFr = frFR.date('2024-06-12T15:00:00Z', 'UTC');
      expect(frFR.formatByString(frFR.startOfWeek(wednesdayFr), 'yyyy-MM-dd')).toBe('2024-06-10'); // Monday
      expect(frFR.formatByString(frFR.endOfWeek(wednesdayFr), 'yyyy-MM-dd')).toBe('2024-06-16'); // Sunday
    });

    it('startOfWeek is midnight and endOfWeek is one nanosecond before the following midnight', () => {
      const wednesday = enUS.date('2024-06-12T15:00:00Z', 'UTC');
      const start = enUS.startOfWeek(wednesday);
      expect(enUS.getHours(start)).toBe(0);
      expect(enUS.getMinutes(start)).toBe(0);
      expect(enUS.getSeconds(start)).toBe(0);

      const end = enUS.endOfWeek(wednesday);
      const oneNsLater = end.add({ nanoseconds: 1 });
      expect(enUS.getHours(oneNsLater)).toBe(0);
      expect(enUS.formatByString(oneNsLater, 'yyyy-MM-dd')).toBe(
        enUS.formatByString(enUS.startOfWeek(wednesday).add({ days: 7 }), 'yyyy-MM-dd'),
      );
    });
  });

  describe('startOfYear/Month/Day and endOfYear/Month/Day', () => {
    it('bound the year, month, and day correctly', () => {
      const value = enUS.date('2024-06-12T15:30:45Z', 'UTC');

      expect(enUS.formatByString(enUS.startOfYear(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-01-01 00:00:00');
      expect(enUS.formatByString(enUS.startOfMonth(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-01 00:00:00');
      expect(enUS.formatByString(enUS.startOfDay(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-12 00:00:00');

      // endOf* is one nanosecond before the next boundary — formatting drops the sub-second
      // remainder, so it should read as 23:59:59 the day/month/year before the next one starts.
      expect(enUS.formatByString(enUS.endOfDay(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-12 23:59:59');
      expect(enUS.formatByString(enUS.endOfMonth(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-30 23:59:59');
      expect(enUS.formatByString(enUS.endOfYear(value), 'yyyy-MM-dd HH:mm:ss')).toBe('2024-12-31 23:59:59');
    });
  });

  describe('getDaysInMonth', () => {
    it('accounts for leap years', () => {
      expect(enUS.getDaysInMonth(enUS.date('2024-02-01T00:00:00Z', 'UTC'))).toBe(29); // leap
      expect(enUS.getDaysInMonth(enUS.date('2023-02-01T00:00:00Z', 'UTC'))).toBe(28); // not leap
      expect(enUS.getDaysInMonth(enUS.date('2024-04-01T00:00:00Z', 'UTC'))).toBe(30);
      expect(enUS.getDaysInMonth(enUS.date('2024-01-01T00:00:00Z', 'UTC'))).toBe(31);
    });
  });

  describe('getWeekNumber', () => {
    it('returns the ISO 8601 week-of-year number', () => {
      // 2024-06-12 falls in ISO week 24.
      expect(enUS.getWeekNumber(enUS.date('2024-06-12T00:00:00Z', 'UTC'))).toBe(24);
    });
  });

  describe('getDayOfWeek', () => {
    it('is 1-based and locale-relative, not raw ISO', () => {
      // 2024-06-12 is a Wednesday: 4th day of an en-US (Sunday-first) week, 3rd day of an
      // fr-FR (Monday-first) week.
      const wednesdayEn = enUS.date('2024-06-12T15:00:00Z', 'UTC');
      const wednesdayFr = frFR.date('2024-06-12T15:00:00Z', 'UTC');
      expect(enUS.getDayOfWeek(wednesdayEn)).toBe(4);
      expect(frFR.getDayOfWeek(wednesdayFr)).toBe(3);
    });
  });

  describe('getWeekArray', () => {
    it('builds a full calendar grid, in complete 7-day weeks, respecting the locale\'s first day', () => {
      const juneEn = enUS.date('2024-06-15T00:00:00Z', 'UTC');
      const weeksEn = enUS.getWeekArray(juneEn);

      // en-US: June 1 2024 is a Saturday, June 30 is a Sunday — the grid runs Sun May 26
      // through Sat Jul 6, i.e. 6 weeks.
      expect(weeksEn).toHaveLength(6);
      weeksEn.forEach((week) => expect(week).toHaveLength(7));
      expect(enUS.formatByString(weeksEn[0]![0]!, 'yyyy-MM-dd')).toBe('2024-05-26');
      expect(enUS.formatByString(weeksEn[5]![6]!, 'yyyy-MM-dd')).toBe('2024-07-06');
      // Every row's first day is a Sunday for en-US.
      weeksEn.forEach((week) => expect(enUS.getDayOfWeek(week[0]!)).toBe(1));

      const juneFr = frFR.date('2024-06-15T00:00:00Z', 'UTC');
      const weeksFr = frFR.getWeekArray(juneFr);

      // fr-FR: grid runs Mon May 27 through Sun Jun 30 — 5 weeks.
      expect(weeksFr).toHaveLength(5);
      expect(frFR.formatByString(weeksFr[0]![0]!, 'yyyy-MM-dd')).toBe('2024-05-27');
      expect(frFR.formatByString(weeksFr[4]![6]!, 'yyyy-MM-dd')).toBe('2024-06-30');
      weeksFr.forEach((week) => expect(frFR.getDayOfWeek(week[0]!)).toBe(1));
    });
  });

  describe('getYearRange', () => {
    it('lists every year between start and end, inclusive, each as the start of its year', () => {
      const start = enUS.date('2024-06-01T00:00:00Z', 'UTC');
      const end = enUS.date('2026-01-15T00:00:00Z', 'UTC');
      const years = enUS.getYearRange([start, end]);
      expect(years.map((y) => enUS.getYear(y))).toEqual([2024, 2025, 2026]);
      years.forEach((y) => {
        expect(enUS.getMonth(y)).toBe(0);
        expect(enUS.getDate(y)).toBe(1);
      });
    });
  });
});
