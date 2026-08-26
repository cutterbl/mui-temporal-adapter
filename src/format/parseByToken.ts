import { getTemporal } from '../temporal-runtime/getTemporal';
import { tokenizeFormat } from './tokenizeFormat';

/** Date/time fields accumulated while walking the input string against the format. */
interface ParsedFields {
  year?: number;
  month?: number;
  day?: number;
  hour24?: number;
  hour12?: number;
  minute?: number;
  second?: number;
  meridiem?: 'AM' | 'PM';
}

/** An arbitrary reference month/year — only ever used to read *names*, not values. */
const NAME_REFERENCE_YEAR = 2000;
/** 2023-01-01T00:00:00Z is a Sunday — the reference week `weekdayNames()` reads from. */
const REFERENCE_SUNDAY_UTC_MS = Date.UTC(2023, 0, 1);
const ONE_DAY_MS = 86_400_000;

/**
 * Reads this locale's month names (January … December) at a given name length.
 * @param locale - The locale to read names in.
 * @param style - `'short'` (e.g. `'Jan'`) or `'long'` (e.g. `'January'`).
 * @returns The 12 month names, in calendar order.
 */
function monthNames(locale: string, style: 'short' | 'long'): string[] {
  return Array.from({ length: 12 }, (_unused, month) =>
    new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(
      new Date(Date.UTC(NAME_REFERENCE_YEAR, month, 1)),
    ),
  );
}

/**
 * Reads this locale's weekday names (Sunday … Saturday) at a given name length.
 * @param locale - The locale to read names in.
 * @param style - `'short'`, `'long'`, or `'narrow'`.
 * @returns The 7 weekday names, starting from Sunday.
 */
function weekdayNames(locale: string, style: 'short' | 'long' | 'narrow'): string[] {
  return Array.from({ length: 7 }, (_unused, day) =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
      new Date(REFERENCE_SUNDAY_UTC_MS + day * ONE_DAY_MS),
    ),
  );
}

/**
 * Reads this locale's meridiem text for a given hour (0–23).
 * @param locale - The locale to read it in.
 * @param hour - A 24-hour-clock hour to read the meridiem text for.
 * @returns The localized meridiem text (e.g. `'AM'`/`'PM'`, or a locale's own).
 */
function meridiemText(locale: string, hour: number): string {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(NAME_REFERENCE_YEAR, 0, 1, hour, 0, 0)));
  return parts.find((part) => part.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM');
}

/**
 * Finds the longest of `candidates` that `input` starts with at `pos`, matched
 * case-insensitively (longest first, so no candidate that's a prefix of another
 * candidate can shadow it).
 * @param input - The full input string being parsed.
 * @param pos - Where in `input` to start matching.
 * @param candidates - The strings to try.
 * @returns The matching candidate (in its original casing), or `null` if none match.
 */
function matchCandidate(input: string, pos: number, candidates: string[]): string | null {
  const rest = input.slice(pos).toLowerCase();
  let best: string | null = null;
  for (const candidate of candidates) {
    if (
      rest.startsWith(candidate.toLowerCase()) &&
      (best === null || candidate.length > best.length)
    ) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Consumes a run of `minLength`–`maxLength` digits from `input` at `pos`.
 * @param input - The full input string being parsed.
 * @param pos - Where in `input` to start reading.
 * @param minLength - The fewest digits that still counts as a match.
 * @param maxLength - The most digits to consume, even if more follow.
 * @returns The consumed digit text and the position just past it, or `null` if fewer
 *   than `minLength` digits are available at `pos`.
 */
function consumeDigits(
  input: string,
  pos: number,
  minLength: number,
  maxLength: number,
): { text: string; next: number } | null {
  let end = pos;
  while (end < input.length && end - pos < maxLength && /\d/.test(input[end] ?? '')) {
    end += 1;
  }
  if (end - pos < minLength) {
    return null;
  }
  return { text: input.slice(pos, end), next: end };
}

/**
 * Consumes one format token's worth of text from `input` at `pos`, recording
 * whatever it reads into `fields`. Weekday tokens (`c`/`E`/`ccc`/`EEE`/`cccc`/`EEEE`/
 * `ccccc`) are matched and consumed like everything else, but — being redundant once
 * year/month/day are known — don't set anything on `fields`.
 * @param token - The format token to match (e.g. `'yyyy'`, `'MMMM'`).
 * @param input - The full input string being parsed.
 * @param pos - Where in `input` to start reading.
 * @param locale - The locale to match month/weekday/meridiem names in.
 * @param fields - Accumulator, mutated in place with whatever this token reads.
 * @returns The input position just past what this token consumed, or `null` if
 *   `input` doesn't match what `token` expects at `pos`.
 * @throws If `token` isn't a token this adapter understands.
 */
function consumeToken(
  token: string,
  input: string,
  pos: number,
  locale: string,
  fields: ParsedFields,
): number | null {
  switch (token) {
    case 'yyyy':
    case 'y': {
      const digits = consumeDigits(input, pos, 1, token === 'yyyy' ? 4 : 6);
      if (!digits) return null;
      fields.year = Number(digits.text);
      return digits.next;
    }
    case 'yy': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      const currentCentury = Math.floor(getTemporal().Now.plainDateISO().year / 100) * 100;
      fields.year = currentCentury + Number(digits.text);
      return digits.next;
    }
    case 'L':
    case 'M': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.month = Number(digits.text);
      return digits.next;
    }
    case 'LL':
    case 'MM': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.month = Number(digits.text);
      return digits.next;
    }
    case 'LLL':
    case 'MMM': {
      const names = monthNames(locale, 'short');
      const match = matchCandidate(input, pos, names);
      if (!match) return null;
      fields.month = names.findIndex((name) => name.toLowerCase() === match.toLowerCase()) + 1;
      return pos + match.length;
    }
    case 'LLLL':
    case 'MMMM': {
      const names = monthNames(locale, 'long');
      const match = matchCandidate(input, pos, names);
      if (!match) return null;
      fields.month = names.findIndex((name) => name.toLowerCase() === match.toLowerCase()) + 1;
      return pos + match.length;
    }
    case 'd': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.day = Number(digits.text);
      return digits.next;
    }
    case 'dd': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.day = Number(digits.text);
      return digits.next;
    }
    case 'c':
    case 'E': {
      const digits = consumeDigits(input, pos, 1, 1);
      return digits ? digits.next : null;
    }
    case 'ccc':
    case 'EEE': {
      const match = matchCandidate(input, pos, weekdayNames(locale, 'short'));
      return match ? pos + match.length : null;
    }
    case 'cccc':
    case 'EEEE': {
      const match = matchCandidate(input, pos, weekdayNames(locale, 'long'));
      return match ? pos + match.length : null;
    }
    case 'ccccc': {
      const match = matchCandidate(input, pos, weekdayNames(locale, 'narrow'));
      return match ? pos + match.length : null;
    }
    case 'a': {
      const am = meridiemText(locale, 1);
      const pm = meridiemText(locale, 13);
      const match = matchCandidate(input, pos, [am, pm]);
      if (!match) return null;
      fields.meridiem = match.toLowerCase() === am.toLowerCase() ? 'AM' : 'PM';
      return pos + match.length;
    }
    case 'H': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.hour24 = Number(digits.text);
      return digits.next;
    }
    case 'HH': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.hour24 = Number(digits.text);
      return digits.next;
    }
    case 'h': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.hour12 = Number(digits.text);
      return digits.next;
    }
    case 'hh': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.hour12 = Number(digits.text);
      return digits.next;
    }
    case 'm': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.minute = Number(digits.text);
      return digits.next;
    }
    case 'mm': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.minute = Number(digits.text);
      return digits.next;
    }
    case 's': {
      const digits = consumeDigits(input, pos, 1, 2);
      if (!digits) return null;
      fields.second = Number(digits.text);
      return digits.next;
    }
    case 'ss': {
      const digits = consumeDigits(input, pos, 2, 2);
      if (!digits) return null;
      fields.second = Number(digits.text);
      return digits.next;
    }
    default:
      throw new Error(`[AdapterTemporal] Unsupported format token "${token}" in parse().`);
  }
}

/**
 * Parses a string against a format string, producing a `Temporal.ZonedDateTime` in
 * `timeZone`, or `null` if `input` doesn't match `formatString`.
 *
 * `formatString` is expected to already be expanded (see `expandFormat()`) — this
 * function itself only understands literal text and the plain field tokens
 * `formatByToken()` does, not the `D`/`DD`/`T` locale macros.
 *
 * Any date/time field the format string doesn't mention falls back to the current
 * moment in `timeZone` for date fields (year/month/day) and to `0` for time fields
 * (hour/minute/second) — so a time-only format like `'HH:mm'` still anchors to today,
 * and a date-only format like `'yyyy-MM-dd'` still produces midnight.
 *
 * @param input - The string to parse.
 * @param formatString - The (already-expanded) format string `input` should match.
 * @param locale - The locale to match month/weekday/meridiem names in.
 * @param timeZone - The time zone to build the result in, and to source today's date
 *   from for any field `formatString` leaves unspecified.
 * @returns The parsed date, or `null` if `input` doesn't match `formatString`.
 */
export function parseByToken(
  input: string,
  formatString: string,
  locale: string,
  timeZone: string,
): Temporal.ZonedDateTime | null {
  const tokens = tokenizeFormat(formatString);
  const fields: ParsedFields = {};
  let pos = 0;

  for (const tok of tokens) {
    if (tok.literal) {
      if (!input.startsWith(tok.value, pos)) {
        return null;
      }
      pos += tok.value.length;
      continue;
    }
    const next = consumeToken(tok.value, input, pos, locale, fields);
    if (next === null) {
      return null;
    }
    pos = next;
  }

  if (pos !== input.length) {
    return null;
  }

  let hour24 = fields.hour24 ?? fields.hour12 ?? 0;
  if (fields.meridiem === 'PM' && hour24 < 12) {
    hour24 += 12;
  } else if (fields.meridiem === 'AM' && hour24 === 12) {
    hour24 = 0;
  }

  try {
    const TemporalNS = getTemporal();
    const today = TemporalNS.Now.plainDateISO(timeZone);
    const plainDateTime = TemporalNS.PlainDateTime.from(
      {
        year: fields.year ?? today.year,
        month: fields.month ?? today.month,
        day: fields.day ?? today.day,
        hour: hour24,
        minute: fields.minute ?? 0,
        second: fields.second ?? 0,
      },
      { overflow: 'reject' },
    );
    return plainDateTime.toZonedDateTime(timeZone);
  } catch {
    return null;
  }
}
