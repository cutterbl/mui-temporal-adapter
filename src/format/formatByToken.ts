import { getFirstDayOfWeek } from '../week-info/getFirstDayOfWeek';
import { expandMacroToken } from './expandFormat';
import { tokenizeFormat } from './tokenizeFormat';

/**
 * Right-pads a number with leading zeroes to at least `length` digits. Numbers
 * already at or past `length` digits are returned unchanged (never truncated).
 * @param n - The number to pad.
 * @param length - The minimum number of digits.
 * @returns The zero-padded number, as a string.
 */
function pad(n: number, length: number): string {
  return String(n).padStart(length, '0');
}

/**
 * Reads the localized AM/PM string for a date's hour, using its own time zone
 * regardless of the runtime's system zone. `Temporal.ZonedDateTime` has no
 * `formatToParts()` of its own (only the whole-string `toLocaleString()`), so this
 * reconstructs an equivalent moment as a plain `Date` and pins a fresh
 * `Intl.DateTimeFormat` to the value's own zone explicitly, rather than the
 * formatter's (or the system's) default.
 * @param value - The date whose meridiem to read.
 * @param locale - The locale to read it in.
 * @returns The localized meridiem string (e.g. `'AM'`, `'PM'`, or a locale's own
 *   equivalent).
 */
function getMeridiem(value: Temporal.ZonedDateTime, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
    timeZone: value.timeZoneId,
  }).formatToParts(new Date(value.epochMilliseconds));
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value;
  return dayPeriod ?? (value.hour < 12 ? 'AM' : 'PM');
}

/**
 * Formats a single token (as produced by `tokenizeFormat()`) against a date.
 *
 * Digit tokens (`yyyy`, `MM`, `dd`, `HH`, …) read straight off the
 * `Temporal.ZonedDateTime`'s own fields, always as plain ASCII digits (never a
 * locale's native numbering system) — kept parseable by this same engine's
 * `parseByToken()` (which only reads ASCII digits) and keyboard-typeable in an
 * editable field section; a consumer wanting a different numbering system overrides
 * `AdapterTemporal.formatNumber()`, the interface's own documented extension point
 * for exactly this, rather than this function switching automatically. Name tokens
 * (`MMMM`, `EEEE`, `a`, …) delegate to
 * `value.toLocaleString()` — which, unlike a bare `Intl.DateTimeFormat`, always
 * resolves the date's own time zone rather than the formatter's default — so the
 * result is correct as displayed in `value`'s zone, whatever the runtime's zone is.
 * The locale-macro tokens `D`/`DD`/`T` expand into, and are formatted as, a sequence
 * of these same tokens (see `expandFormat.ts`), for the same ASCII-digit reason.
 *
 * @param value - The date to format.
 * @param token - A single format token, e.g. `'yyyy'` or `'MMMM'`.
 * @param locale - The locale to format names (month, weekday, meridiem) in.
 * @returns The formatted text for just this one token.
 * @throws If `token` isn't a token this adapter understands.
 */
export function formatByToken(
  value: Temporal.ZonedDateTime,
  token: string,
  locale: string,
): string {
  switch (token) {
    case 'y':
      return String(value.year);
    case 'yy':
      return pad(((value.year % 100) + 100) % 100, 2);
    case 'yyyy':
      return pad(value.year, 4);
    case 'L':
    case 'M':
      return String(value.month);
    case 'LL':
    case 'MM':
      return pad(value.month, 2);
    case 'LLL':
    case 'MMM':
      return value.toLocaleString(locale, { month: 'short' });
    case 'LLLL':
    case 'MMMM':
      return value.toLocaleString(locale, { month: 'long' });
    case 'd':
      return String(value.day);
    case 'dd':
      return pad(value.day, 2);
    case 'c': {
      const firstDay = getFirstDayOfWeek(locale);
      return String(((value.dayOfWeek - firstDay + 7) % 7) + 1);
    }
    case 'ccc':
    case 'EEE':
      return value.toLocaleString(locale, { weekday: 'short' });
    case 'cccc':
    case 'EEEE':
      return value.toLocaleString(locale, { weekday: 'long' });
    case 'ccccc':
      return value.toLocaleString(locale, { weekday: 'narrow' });
    case 'E':
      return String(value.dayOfWeek);
    case 'a':
      return getMeridiem(value, locale);
    case 'H':
      return String(value.hour);
    case 'HH':
      return pad(value.hour, 2);
    case 'h':
      return String(value.hour % 12 || 12);
    case 'hh':
      return pad(value.hour % 12 || 12, 2);
    case 'm':
      return String(value.minute);
    case 'mm':
      return pad(value.minute, 2);
    case 's':
      return String(value.second);
    case 'ss':
      return pad(value.second, 2);
    case 'D':
    case 'DD':
    case 'T':
      // Expand the macro into this locale's own field-token sequence and format
      // *that* — rather than delegating straight to `Intl`/`toLocaleString()` — so
      // digits stay plain ASCII (and overridable via `formatNumber()`) like every
      // other digit token, instead of a locale's native numbering system (e.g.
      // Arabic-Indic digits for `ar-SA`), which `parseByToken()` can't read back.
      return tokenizeFormat(expandMacroToken(token, locale))
        .map((tok) => (tok.literal ? tok.value : formatByToken(value, tok.value, locale)))
        .join('');
    default:
      throw new Error(`[AdapterTemporal] Unsupported format token "${token}".`);
  }
}
