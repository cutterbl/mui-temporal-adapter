import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — format / parse / expandFormat', () => {
  let enUS: AdapterTemporal;
  let frFR: AdapterTemporal;

  beforeAll(async () => {
    enUS = await buildAdapter({ locale: 'en-US' });
    frFR = await buildAdapter({ locale: 'fr-FR' });
  });

  describe('formatByString — digit tokens', () => {
    it('renders plain, zero-padded ASCII digits regardless of locale', () => {
      const value = enUS.date('2024-03-05T09:08:07Z', 'UTC');
      expect(enUS.formatByString(value, 'yyyy-MM-dd')).toBe('2024-03-05');
      expect(enUS.formatByString(value, 'HH:mm:ss')).toBe('09:08:07');
      expect(enUS.formatByString(value, 'y-M-d')).toBe('2024-3-5'); // unpadded variants
    });

    it('supports literal text via single-quoting, including an escaped literal quote', () => {
      const value = enUS.date('2024-03-05T09:00:00Z', 'UTC');
      expect(enUS.formatByString(value, "yyyy-MM-dd 'at' HH:mm")).toBe('2024-03-05 at 09:00');
      // `''` inside a quoted run is one literal apostrophe (see `escapedCharacters`/
      // `tokenizeFormat`'s own doc comment) — "don''t" renders as "don't".
      expect(enUS.formatByString(value, "'don''t' yyyy")).toBe("don't 2024");
    });

    it('12-hour tokens wrap correctly at noon and midnight', () => {
      const noon = enUS.date('2024-03-05T12:00:00Z', 'UTC');
      const midnight = enUS.date('2024-03-05T00:00:00Z', 'UTC');
      expect(enUS.formatByString(noon, 'hh:mm a')).toBe('12:00 PM');
      expect(enUS.formatByString(midnight, 'hh:mm a')).toBe('12:00 AM');
    });

    it('every remaining unpadded/2-digit-year/single-digit-field token renders correctly', () => {
      const value = enUS.date('2024-03-05T09:08:07Z', 'UTC'); // a Tuesday
      expect(enUS.formatByString(value, 'yy')).toBe('24');
      expect(enUS.formatByString(value, 'E')).toBe(String(value.dayOfWeek)); // raw ISO weekday number
      expect(enUS.formatByString(value, 'c')).toBe('3'); // en-US (Sunday-first): Tue is day 3
      expect(enUS.formatByString(value, 'H')).toBe('9');
      expect(enUS.formatByString(value, 'm')).toBe('8');
      expect(enUS.formatByString(value, 's')).toBe('7');
    });

    it('throws for a token it doesn\'t understand', () => {
      const value = enUS.date('2024-03-05T00:00:00Z', 'UTC');
      expect(() => enUS.formatByString(value, 'q')).toThrow(/Unsupported format token/);
    });

    it('a standalone \'\' (escaped apostrophe, on its own) renders as one literal apostrophe', () => {
      const value = enUS.date('2024-03-05T00:00:00Z', 'UTC');
      expect(enUS.formatByString(value, "''")).toBe("'");
    });

    it('an unterminated quote (no closing apostrophe) still tokenizes, running to the end of the string', () => {
      const value = enUS.date('2024-03-05T00:00:00Z', 'UTC');
      expect(enUS.formatByString(value, "yyyy 'oops")).toBe('2024 oops');
    });
  });

  describe('formatByString — name tokens', () => {
    it('delegates month/weekday names to Intl, matching a direct Intl call for the same locale', () => {
      const value = enUS.date('2024-03-05T00:00:00Z', 'UTC'); // a Tuesday
      const expectedMonth = value.toLocaleString('en-US', { month: 'long' });
      const expectedWeekday = value.toLocaleString('en-US', { weekday: 'long' });
      expect(enUS.formatByString(value, 'MMMM')).toBe(expectedMonth);
      expect(enUS.formatByString(value, 'EEEE')).toBe(expectedWeekday);

      const frValue = frFR.date('2024-03-05T00:00:00Z', 'UTC');
      expect(frFR.formatByString(frValue, 'MMMM')).toBe(frValue.toLocaleString('fr-FR', { month: 'long' }));
    });
  });

  describe('format() — named formats', () => {
    it('formats using the adapter\'s configured named formats', () => {
      const value = enUS.date('2024-03-05T09:08:00Z', 'UTC');
      expect(enUS.format(value, 'year')).toBe('2024');
      expect(enUS.format(value, 'fullTime24h')).toBe('09:08');
      expect(enUS.format(value, 'month')).toBe(value.toLocaleString('en-US', { month: 'long' }));
    });

    it('formats the D/DD/T locale-macro named formats directly (unexpanded), not just via expandFormat()', () => {
      const value = enUS.date('2024-03-05T09:08:00Z', 'UTC');
      // fullDate: 'DD', keyboardDate: 'D', keyboardDateTime24h: 'D T' — exercises
      // `formatByToken()`'s own D/DD/T case directly, since `format()`/`formatByString()`
      // never call `expandFormat()` themselves (only `parse()` does).
      const expectedD = enUS.formatByString(value, enUS.expandFormat('D'));
      const expectedDD = enUS.formatByString(value, enUS.expandFormat('DD'));
      const expectedT = enUS.formatByString(value, enUS.expandFormat('T'));
      expect(enUS.format(value, 'keyboardDate')).toBe(expectedD);
      expect(enUS.format(value, 'fullDate')).toBe(expectedDD);
      expect(enUS.format(value, 'keyboardDateTime24h')).toBe(`${expectedD} ${expectedT}`);
    });

    it('respects `formats` overrides passed to the constructor', async () => {
      const custom = await buildAdapter({ locale: 'en-US', formats: { year: "'Y'yyyy" } });
      const value = custom.date('2024-03-05T00:00:00Z', 'UTC');
      expect(custom.format(value, 'year')).toBe('Y2024');
    });
  });

  describe('expandFormat', () => {
    it('expands D/DD/T into this locale\'s own field order, round-trippable by parse()', () => {
      const value = enUS.date('2024-03-05T14:30:00', 'system');

      const dExpanded = enUS.expandFormat('D');
      const roundTripD = enUS.parse(enUS.formatByString(value, dExpanded), dExpanded);
      expect(roundTripD).not.toBeNull();
      expect(enUS.isSameDay(roundTripD!, value)).toBe(true);

      const tExpanded = enUS.expandFormat('T');
      const roundTripT = enUS.parse(enUS.formatByString(value, tExpanded), tExpanded);
      expect(roundTripT).not.toBeNull();
      expect(enUS.getHours(roundTripT!)).toBe(enUS.getHours(value));
      expect(enUS.getMinutes(roundTripT!)).toBe(enUS.getMinutes(value));
    });

    it('auto-quotes a stray unrecognized word so it round-trips as literal text', () => {
      // "foo" contains no letters this adapter recognizes as format tokens, so it should
      // survive `expandFormat()` + `formatByString()` unchanged, exactly like real literal
      // text would. (A word built only from *reserved* letters — e.g. "at", where the lone
      // "a" is itself the meridiem token — can't be disambiguated this way; a consumer
      // writing genuine literal text has to quote it themselves in that case, same as every
      // other Luxon-style token engine.)
      const value = enUS.date('2024-03-05T09:08:00Z', 'UTC');
      const expanded = enUS.expandFormat('foo HH:mm');
      expect(enUS.formatByString(value, expanded)).toBe(`foo ${enUS.formatByString(value, 'HH:mm')}`);
    });
  });

  describe('parse', () => {
    it('round-trips a value formatted with a custom, already-expanded pattern', () => {
      const pattern = 'yyyy-MM-dd HH:mm:ss';
      const value = enUS.date('2024-03-05T14:30:15', 'system');
      const formatted = enUS.formatByString(value, pattern);
      const parsed = enUS.parse(formatted, pattern);
      expect(parsed).not.toBeNull();
      expect(enUS.isEqual(parsed, value)).toBe(true);
    });

    it('returns null for an empty string', () => {
      expect(enUS.parse('', 'yyyy-MM-dd')).toBeNull();
    });

    it('returns null when the input doesn\'t match the format', () => {
      expect(enUS.parse('not a date', 'yyyy-MM-dd')).toBeNull();
      expect(enUS.parse('2024-13-40', 'yyyy-MM-dd')).toBeNull(); // out-of-range, overflow: 'reject'
    });

    it('round-trips every individual field token format/parse can handle', () => {
      // 2024-03-05T09:08:07 is a Tuesday — built in 'system' so parse() (which always
      // builds in the runtime's current zone) round-trips correctly against it.
      const value = enUS.date('2024-03-05T09:08:07', 'system');
      const tokens = [
        'y',
        'yyyy',
        'L',
        'LL',
        'LLL',
        'LLLL',
        'M',
        'MM',
        'MMM',
        'MMMM',
        'd',
        'dd',
        'c',
        'E',
        'ccc',
        'cccc',
        'ccccc',
        'H',
        'HH',
        'm',
        'mm',
        's',
        'ss',
      ];
      for (const token of tokens) {
        const formatted = enUS.formatByString(value, token);
        const parsed = enUS.parse(formatted, token);
        expect(parsed, `token "${token}" (formatted "${formatted}") should parse back`).not.toBeNull();
      }
    });

    it('parses the "yy" 2-digit year against the current century', () => {
      const currentCentury = Math.floor(enUS.getYear(enUS.date(undefined, 'system')) / 100) * 100;
      const parsed = enUS.parse('24', 'yy');
      expect(parsed).not.toBeNull();
      expect(enUS.getYear(parsed!)).toBe(currentCentury + 24);
    });

    it('applies the 12-hour "h"/"a" AM/PM adjustment correctly at every boundary', () => {
      // Noon: 12 + PM stays hour 12 (not 24).
      expect(enUS.getHours(enUS.parse('12:00 PM', 'h:mm a')!)).toBe(12);
      // Midnight: 12 + AM becomes hour 0.
      expect(enUS.getHours(enUS.parse('12:00 AM', 'h:mm a')!)).toBe(0);
      // Afternoon: an hour below 12 + PM adds 12.
      expect(enUS.getHours(enUS.parse('3:00 PM', 'h:mm a')!)).toBe(15);
      // Morning: an hour below 12 + AM is unchanged.
      expect(enUS.getHours(enUS.parse('3:00 AM', 'h:mm a')!)).toBe(3);
    });

    it('returns null for a range of malformed inputs, per-token', () => {
      expect(enUS.parse('2024-03-0X', 'yyyy-MM-dd')).toBeNull(); // non-digit where a digit is expected
      expect(enUS.parse('2024-3-05', 'yyyy-MM-dd')).toBeNull(); // 'MM' requires exactly 2 digits
      expect(enUS.parse('Fooember 5', 'MMMM d')).toBeNull(); // unrecognized month name
      expect(enUS.parse('Fooday, March 5', 'EEEE, MMMM d')).toBeNull(); // unrecognized weekday name
      expect(enUS.parse('9:00 XM', 'H:mm a')).toBeNull(); // unrecognized meridiem text
      expect(enUS.parse('2024-03-05 extra', 'yyyy-MM-dd')).toBeNull(); // trailing unconsumed input
    });

    it('defaults unmentioned date fields to today and unmentioned time fields to zero', () => {
      const today = enUS.date(undefined, 'system');
      const timeOnly = enUS.parse('14:30', 'HH:mm');
      expect(timeOnly).not.toBeNull();
      expect(enUS.isSameDay(timeOnly!, today)).toBe(true);
      expect(enUS.getHours(timeOnly!)).toBe(14);
      expect(enUS.getMinutes(timeOnly!)).toBe(30);

      const dateOnly = enUS.parse('2024-03-05', 'yyyy-MM-dd');
      expect(dateOnly).not.toBeNull();
      expect(enUS.getHours(dateOnly!)).toBe(0);
      expect(enUS.getMinutes(dateOnly!)).toBe(0);
    });
  });

  describe('is12HourCycleInCurrentLocale / formatNumber', () => {
    it('reports the locale\'s own hour-cycle preference', () => {
      expect(enUS.is12HourCycleInCurrentLocale()).toBe(true);
      expect(frFR.is12HourCycleInCurrentLocale()).toBe(false);
    });

    it('formatNumber is the identity function', () => {
      expect(enUS.formatNumber('042')).toBe('042');
    });
  });
});
