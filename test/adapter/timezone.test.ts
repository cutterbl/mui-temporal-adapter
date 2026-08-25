import { beforeAll, describe, expect, it } from 'vitest';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import { buildAdapter } from '../helpers/buildAdapter';

describe('AdapterTemporal — timezone / date-builder / validity', () => {
  let adapter: AdapterTemporal;

  beforeAll(async () => {
    adapter = await buildAdapter({ locale: 'en-US' });
  });

  describe('date()', () => {
    it('returns null for a null value, and "now" for an undefined value', () => {
      expect(adapter.date(null)).toBeNull();
      const now = adapter.date(undefined, 'UTC');
      expect(adapter.isValid(now)).toBe(true);
    });

    it('parses an absolute instant string and reprojects it into the requested timezone', () => {
      const value = adapter.date('2024-06-15T12:00:00Z', 'Asia/Tokyo');
      expect(adapter.getTimezone(value)).toBe('Asia/Tokyo');
      // Tokyo is a fixed UTC+09:00 (no DST): noon UTC -> 21:00 Tokyo, same instant.
      expect(adapter.formatByString(value, 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-15 21:00:00');
      expect(adapter.toJsDate(value).toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('parses a wall-clock (offset-less) string as local time *in* the requested timezone', () => {
      const value = adapter.date('2024-06-15T12:00:00', 'Asia/Tokyo');
      expect(adapter.formatByString(value, 'yyyy-MM-dd HH:mm:ss')).toBe('2024-06-15 12:00:00');
      expect(adapter.getTimezone(value)).toBe('Asia/Tokyo');
    });

    it('returns the invalid-date sentinel for unparseable non-empty input, not null and not a throw', () => {
      const invalid = adapter.date('not a real date at all', 'UTC');
      expect(adapter.isValid(invalid)).toBe(false);
      expect(adapter.isEqual(invalid, adapter.getInvalidDate())).toBe(true);
    });

    it('treats an empty string the same as unparseable input', () => {
      expect(adapter.isValid(adapter.date('', 'UTC'))).toBe(false);
    });

    it('resolves "default"/"system" to the runtime\'s own current timezone', () => {
      const value = adapter.date(undefined, 'default');
      expect(adapter.getTimezone(value)).toBe(new Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
  });

  describe('getTimezone / setTimezone', () => {
    it('getTimezone always reports a concrete IANA zone id, never "system"/"default"', () => {
      const value = adapter.date(undefined, 'system');
      expect(adapter.getTimezone(value)).not.toBe('system');
      expect(adapter.getTimezone(value)).not.toBe('default');
    });

    it('setTimezone preserves the instant while changing the reported zone and wall-clock fields', () => {
      const value = adapter.date('2024-06-15T12:00:00Z', 'UTC');
      const converted = adapter.setTimezone(value, 'Asia/Tokyo');
      expect(adapter.getTimezone(converted)).toBe('Asia/Tokyo');
      expect(adapter.isEqual(value, converted)).toBe(true); // same instant
      expect(adapter.formatByString(converted, 'HH:mm')).toBe('21:00'); // different local fields
    });
  });

  describe('toJsDate', () => {
    it('converts to a JS Date preserving the exact instant', () => {
      const value = adapter.date('2024-06-15T12:34:56.789Z', 'UTC');
      expect(adapter.toJsDate(value).toISOString()).toBe('2024-06-15T12:34:56.789Z');
    });
  });

  describe('getInvalidDate / isValid', () => {
    it('isValid distinguishes null, the invalid sentinel, and a real date', () => {
      expect(adapter.isValid(null)).toBe(false);
      expect(adapter.isValid(adapter.getInvalidDate())).toBe(false);
      expect(adapter.isValid(adapter.date('2024-06-15T00:00:00Z', 'UTC'))).toBe(true);
    });

    it('getInvalidDate is stable and always compares equal to itself', () => {
      expect(adapter.isEqual(adapter.getInvalidDate(), adapter.getInvalidDate())).toBe(true);
    });
  });

  describe('getCurrentLocaleCode', () => {
    it('reports the locale the adapter was constructed with', () => {
      expect(adapter.getCurrentLocaleCode()).toBe('en-US');
    });

    it('falls back to the runtime\'s default locale when none is given', async () => {
      const defaultAdapter = await buildAdapter();
      expect(defaultAdapter.getCurrentLocaleCode()).toBe(Intl.DateTimeFormat().resolvedOptions().locale);
    });
  });
});
