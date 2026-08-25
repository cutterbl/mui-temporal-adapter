import type {
  AdapterFormats,
  DateBuilderReturnType,
  FieldFormatTokenMap,
  MuiPickersAdapter,
  PickersTimezone,
} from '@mui/x-date-pickers/models';
import { getTemporal } from '../temporal-runtime/getTemporal';
import { getFirstDayOfWeek } from '../week-info/getFirstDayOfWeek';
import { createInvalidDate, isValidZonedDateTime } from '../utils/invalid';
import { resolveZone } from '../utils/timezone';
import { defaultFormats, formatTokenMap } from './defaults';
import type { AdapterTemporalOptions } from './AdapterTemporal.types';

/**
 * A `dateAdapter` for `@mui/x-date-pickers/LocalizationProvider` backed by the TC39
 * Temporal API instead of a third-party date library. Its `TDate` is
 * `Temporal.ZonedDateTime`, which carries date, time, and IANA time zone together.
 *
 * Don't construct this class directly — get it from `createTemporalAdapter()`, which
 * resolves Temporal support (native or lazily polyfilled) and locale week-info support
 * first, so that by the time you have this class, every one of its methods can run
 * fully synchronously, exactly as `LocalizationProvider` expects.
 *
 * @example
 * ```tsx
 * const AdapterTemporal = await createTemporalAdapter();
 * <LocalizationProvider dateAdapter={AdapterTemporal}>
 *   <DatePicker />
 * </LocalizationProvider>
 * ```
 */
export default class AdapterTemporal implements MuiPickersAdapter<string> {
  public isMUIAdapter = true;

  public isTimezoneCompatible = true;

  public lib = 'temporal';

  public locale: string;

  public formats: AdapterFormats;

  public escapedCharacters = { start: "'", end: "'" };

  public formatTokenMap: FieldFormatTokenMap = formatTokenMap;

  /**
   * @param options - Optional locale/formats overrides.
   * @param options.locale - A BCP 47 locale tag, e.g. `'fr-FR'`. Defaults to the
   *   runtime's own default locale (`Intl.DateTimeFormat().resolvedOptions().locale`)
   *   when omitted — the same locale `Intl.DateTimeFormat` and `Intl.Locale` would use
   *   on their own, so the adapter's "default locale" and the locale actually driving
   *   its formatting can never drift apart.
   * @param options.formats - Overrides for any subset of the default named formats.
   */
  constructor(options?: AdapterTemporalOptions) {
    this.locale = options?.locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
    this.formats = { ...defaultFormats, ...options?.formats };
  }

  // ---------------------------------------------------------------------------------
  // Date builder / timezone
  // ---------------------------------------------------------------------------------

  /**
   * Creates a date in Temporal's format. With no `value`, creates a date for the
   * current moment. With a `value`, tries to parse it as either an absolute instant
   * (a string with a `Z` or numeric offset, e.g. `'2024-01-01T00:00:00Z'`) or, failing
   * that, as a wall-clock date-time interpreted in `timezone`. Unparseable non-empty
   * input resolves to `getInvalidDate()`, matching how other MUI X adapters return an
   * "invalid" value rather than throwing or returning `null`.
   *
   * @param value - The optional value to parse.
   * @param timezone - The timezone of the date. Default: `'default'`.
   * @returns The parsed date, or `null` if `value` is `null`.
   * @example
   * ```ts
   * adapter.date(); // now, in the default timezone
   * adapter.date('2024-06-01T12:00:00Z', 'America/New_York'); // that instant, shown in NY time
   * ```
   */
  public date = <T extends string | null | undefined>(
    value?: T,
    timezone: PickersTimezone = 'default',
  ): DateBuilderReturnType<T> => {
    if (value === null) {
      return null as DateBuilderReturnType<T>;
    }

    const TemporalNS = getTemporal();
    const zone = resolveZone(timezone);

    if (value === undefined) {
      return TemporalNS.Now.zonedDateTimeISO(zone) as DateBuilderReturnType<T>;
    }

    if (value === '') {
      return createInvalidDate() as DateBuilderReturnType<T>;
    }

    try {
      // Absolute instant strings (with a 'Z' or numeric offset) get reprojected into `zone`.
      return TemporalNS.Instant.from(value).toZonedDateTimeISO(zone) as DateBuilderReturnType<T>;
    } catch {
      try {
        // Wall-clock strings with no offset are interpreted as local time *in* `zone`.
        return TemporalNS.PlainDateTime.from(value, { overflow: 'constrain' }).toZonedDateTime(
          zone,
        ) as DateBuilderReturnType<T>;
      } catch {
        return createInvalidDate() as DateBuilderReturnType<T>;
      }
    }
  };

  /**
   * Creates the fixed "invalid date" sentinel value. Temporal has no first-class
   * invalid-date concept the way some date libraries do — every successfully
   * constructed `Temporal.ZonedDateTime` is valid — so this returns a real,
   * constructible value pinned to a deliberately out-of-range instant instead; see
   * `isValid()` and `src/utils/invalid.ts` for the full rationale.
   * @deprecated This method will be removed in a future major release, per
   *   `@mui/x-date-pickers`'s own deprecation of it on `MuiPickersAdapter`.
   * @returns The invalid date sentinel.
   */
  public getInvalidDate = (): Temporal.ZonedDateTime => createInvalidDate();

  /**
   * Extracts the timezone from a date. Always returns the value's concrete IANA zone
   * id (e.g. `'America/New_York'`) — never the literal string `'system'` — since
   * `Temporal.ZonedDateTime` has no separate marker for "this happened to be the
   * system zone at creation time" the way some date libraries' Zone objects do.
   * @param value - The date from which to get the timezone.
   * @returns The timezone of the date.
   */
  public getTimezone = (value: Temporal.ZonedDateTime): string => value.timeZoneId;

  /**
   * Converts a date to another timezone, preserving the exact instant in time (the
   * same moment, just displayed with a different zone's wall-clock fields) — matching
   * every other MUI X adapter's default `setTimezone` behavior.
   * @param value - The date to convert.
   * @param timezone - The timezone to convert the date to.
   * @returns The converted date.
   */
  public setTimezone = (value: Temporal.ZonedDateTime, timezone: PickersTimezone): Temporal.ZonedDateTime =>
    value.withTimeZone(resolveZone(timezone));

  /**
   * Converts a date to a JavaScript `Date` object. This is an intentionally lossy
   * escape hatch (a `Date` has no time zone of its own) — matches how every other
   * adapter's `toJsDate` behaves.
   * @param value - The value to convert.
   * @returns The JavaScript date.
   */
  public toJsDate = (value: Temporal.ZonedDateTime): Date => new Date(value.epochMilliseconds);

  /**
   * Gets the code of the locale currently used by the adapter.
   * @returns The code of the locale.
   */
  public getCurrentLocaleCode = (): string => this.locale;

  /**
   * Checks whether the current locale uses a 12-hour clock (i.e. time with meridiem).
   * @returns `true` if the current locale uses a 12-hour clock.
   */
  public is12HourCycleInCurrentLocale = (): boolean =>
    Boolean(new Intl.DateTimeFormat(this.locale, { hour: 'numeric' }).resolvedOptions().hour12);

  /**
   * Formats a number for display in the clock. Temporal / the ISO 8601 calendar have
   * no alternate numeral system to substitute, so this is the identity function —
   * matches `AdapterLuxon`'s own default.
   * @param numberToFormat - The number to format.
   * @returns The formatted number, unchanged.
   */
  public formatNumber = (numberToFormat: string): string => numberToFormat;

  // ---------------------------------------------------------------------------------
  // Format / parse — implemented in a later milestone (Temporal has no built-in
  // format-string engine of its own; see `src/format/`).
  // ---------------------------------------------------------------------------------

  /**
   * Formats a date using one of this adapter's named formats.
   * @param value - The date to format.
   * @param formatKey - Which named format to use.
   * @returns The formatted date string.
   */
  public format = (value: Temporal.ZonedDateTime, formatKey: keyof AdapterFormats): string => {
    return this.formatByString(value, this.formats[formatKey]);
  };

  /**
   * Formats a date using a raw format string.
   * @param _value - The date to format.
   * @param _formatString - The format string to use.
   * @returns The formatted date string.
   */
  public formatByString = (_value: Temporal.ZonedDateTime, _formatString: string): string => {
    throw new Error('[AdapterTemporal] formatByString() is not implemented yet — coming in a later milestone.');
  };

  /**
   * Parses a string date in a specific format.
   * @param _value - The string date to parse.
   * @param _formatString - The format the string date is in.
   * @returns The parsed date, or `null` if parsing fails.
   */
  public parse = (_value: string, _formatString: string): Temporal.ZonedDateTime | null => {
    throw new Error('[AdapterTemporal] parse() is not implemented yet — coming in a later milestone.');
  };

  /**
   * Expands a format with no meta-tokens into one with only literal tokens.
   * @param _format - The format to expand.
   * @returns The expanded format.
   */
  public expandFormat = (_format: string): string => {
    throw new Error('[AdapterTemporal] expandFormat() is not implemented yet — coming in a later milestone.');
  };

  // ---------------------------------------------------------------------------------
  // Validity
  // ---------------------------------------------------------------------------------

  /**
   * Checks whether a value is a usable date — i.e. not `null` and not the
   * `getInvalidDate()` sentinel.
   * @param value - The value to test.
   * @returns `true` if `value` is a valid date.
   */
  public isValid = (value: Temporal.ZonedDateTime | null): value is Temporal.ZonedDateTime =>
    isValidZonedDateTime(value);

  // ---------------------------------------------------------------------------------
  // Comparisons
  // ---------------------------------------------------------------------------------

  /**
   * Checks whether two dates represent the same instant in time.
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the two dates are equal.
   */
  public isEqual = (value: Temporal.ZonedDateTime | null, comparing: Temporal.ZonedDateTime | null): boolean => {
    if (value === null && comparing === null) {
      return true;
    }
    if (value === null || comparing === null) {
      return false;
    }
    return value.epochNanoseconds === comparing.epochNanoseconds;
  };

  /**
   * Checks whether two dates are in the same year (using the timezone of the
   * reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the two dates are in the same year.
   */
  public isSameYear = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year === c.year;
  };

  /**
   * Checks whether two dates are in the same month (using the timezone of the
   * reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the two dates are in the same month.
   */
  public isSameMonth = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year === c.year && value.month === c.month;
  };

  /**
   * Checks whether two dates are on the same day (using the timezone of the
   * reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the two dates are on the same day.
   */
  public isSameDay = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year === c.year && value.month === c.month && value.day === c.day;
  };

  /**
   * Checks whether two dates are at the same hour (using the timezone of the
   * reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the two dates are at the same hour.
   */
  public isSameHour = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year === c.year && value.month === c.month && value.day === c.day && value.hour === c.hour;
  };

  /**
   * Checks whether the reference date is strictly after the second date.
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if `value` is after `comparing`.
   */
  public isAfter = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean =>
    value.epochNanoseconds > comparing.epochNanoseconds;

  /**
   * Checks whether the year of the reference date is after the year of the second
   * date (using the timezone of the reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the year of `value` is after the year of `comparing`.
   */
  public isAfterYear = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year > c.year;
  };

  /**
   * Checks whether the day of the reference date is after the day of the second date
   * (using the timezone of the reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the day of `value` is after the day of `comparing`.
   */
  public isAfterDay = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return getTemporal().PlainDate.compare(value.toPlainDate(), c.toPlainDate()) > 0;
  };

  /**
   * Checks whether the reference date is strictly before the second date.
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if `value` is before `comparing`.
   */
  public isBefore = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean =>
    value.epochNanoseconds < comparing.epochNanoseconds;

  /**
   * Checks whether the year of the reference date is before the year of the second
   * date (using the timezone of the reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the year of `value` is before the year of `comparing`.
   */
  public isBeforeYear = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return value.year < c.year;
  };

  /**
   * Checks whether the day of the reference date is before the day of the second date
   * (using the timezone of the reference date).
   * @param value - The reference date.
   * @param comparing - The date to compare with the reference date.
   * @returns `true` if the day of `value` is before the day of `comparing`.
   */
  public isBeforeDay = (value: Temporal.ZonedDateTime, comparing: Temporal.ZonedDateTime): boolean => {
    const c = this.setTimezone(comparing, this.getTimezone(value));
    return getTemporal().PlainDate.compare(value.toPlainDate(), c.toPlainDate()) < 0;
  };

  /**
   * Checks whether a value falls within the given range, inclusive of both ends.
   * @param value - The value to test.
   * @param range - The `[start, end]` range `value` should fall within.
   * @returns `true` if `value` is within `range`.
   */
  public isWithinRange = (
    value: Temporal.ZonedDateTime,
    [start, end]: [Temporal.ZonedDateTime, Temporal.ZonedDateTime],
  ): boolean => this.isEqual(value, start) || this.isEqual(value, end) || (this.isAfter(value, start) && this.isBefore(value, end));

  // ---------------------------------------------------------------------------------
  // Boundaries
  // ---------------------------------------------------------------------------------

  /**
   * Returns the start of the year for the given date.
   * @param value - The original date.
   * @returns The start of the year of the given date.
   */
  public startOfYear = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    value.with({ month: 1, day: 1 }, { overflow: 'constrain' }).startOfDay();

  /**
   * Returns the start of the month for the given date.
   * @param value - The original date.
   * @returns The start of the month of the given date.
   */
  public startOfMonth = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    value.with({ day: 1 }, { overflow: 'constrain' }).startOfDay();

  /**
   * Returns the start of the week for the given date, in this adapter's locale. Pulls
   * the locale's first day of the week from `week-info/getFirstDayOfWeek` (native
   * `Intl.Locale#getWeekInfo()`, or the lazily-loaded fallback table) — Temporal itself
   * has no locale-aware week concept, only the ISO/Monday-first one.
   * @param value - The original date.
   * @returns The start of the week of the given date.
   */
  public startOfWeek = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime => {
    const firstDay = getFirstDayOfWeek(this.locale);
    const diff = (value.dayOfWeek - firstDay + 7) % 7;
    return value.subtract({ days: diff }).startOfDay();
  };

  /**
   * Returns the start of the day for the given date.
   * @param value - The original date.
   * @returns The start of the day of the given date.
   */
  public startOfDay = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime => value.startOfDay();

  /**
   * Returns the end of the year for the given date.
   * @param value - The original date.
   * @returns The end of the year of the given date.
   */
  public endOfYear = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    this.startOfYear(value).add({ years: 1 }, { overflow: 'constrain' }).subtract({ nanoseconds: 1 });

  /**
   * Returns the end of the month for the given date.
   * @param value - The original date.
   * @returns The end of the month of the given date.
   */
  public endOfMonth = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    this.startOfMonth(value).add({ months: 1 }, { overflow: 'constrain' }).subtract({ nanoseconds: 1 });

  /**
   * Returns the end of the week for the given date, in this adapter's locale. See
   * `startOfWeek()` for how the locale's first day of the week is resolved.
   * @param value - The original date.
   * @returns The end of the week of the given date.
   */
  public endOfWeek = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    this.startOfWeek(value).add({ days: 7 }, { overflow: 'constrain' }).subtract({ nanoseconds: 1 });

  /**
   * Returns the end of the day for the given date.
   * @param value - The original date.
   * @returns The end of the day of the given date.
   */
  public endOfDay = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime =>
    value.startOfDay().add({ days: 1 }, { overflow: 'constrain' }).subtract({ nanoseconds: 1 });

  // ---------------------------------------------------------------------------------
  // Arithmetic
  // ---------------------------------------------------------------------------------

  /**
   * Adds the given number of years to a date, constraining to the last valid day of
   * the resulting month rather than overflowing (e.g. Feb 29 + 1 year → Feb 28).
   * @param value - The date to change.
   * @param amount - The number of years to add (may be negative).
   * @returns The new date with the years added.
   */
  public addYears = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ years: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of months to a date, constraining to the last valid day of
   * the resulting month rather than overflowing (e.g. Jan 31 + 1 month → Feb 28/29).
   * @param value - The date to change.
   * @param amount - The number of months to add (may be negative).
   * @returns The new date with the months added.
   */
  public addMonths = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ months: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of weeks to a date.
   * @param value - The date to change.
   * @param amount - The number of weeks to add (may be negative).
   * @returns The new date with the weeks added.
   */
  public addWeeks = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ weeks: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of days to a date.
   * @param value - The date to change.
   * @param amount - The number of days to add (may be negative).
   * @returns The new date with the days added.
   */
  public addDays = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ days: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of hours to a date.
   * @param value - The date to change.
   * @param amount - The number of hours to add (may be negative).
   * @returns The new date with the hours added.
   */
  public addHours = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ hours: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of minutes to a date.
   * @param value - The date to change.
   * @param amount - The number of minutes to add (may be negative).
   * @returns The new date with the minutes added.
   */
  public addMinutes = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ minutes: amount }, { overflow: 'constrain' });

  /**
   * Adds the given number of seconds to a date.
   * @param value - The date to change.
   * @param amount - The number of seconds to add (may be negative).
   * @returns The new date with the seconds added.
   */
  public addSeconds = (value: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime =>
    value.add({ seconds: amount }, { overflow: 'constrain' });

  // ---------------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------------

  /**
   * Gets the year of the given date.
   * @param value - The given date.
   * @returns The year.
   */
  public getYear = (value: Temporal.ZonedDateTime): number => value.year;

  /**
   * Gets the month of the given date. 0-based (January = 0), matching every other MUI
   * X adapter's convention (`Temporal.ZonedDateTime.month` itself is 1-based).
   * @param value - The given date.
   * @returns The 0-based month.
   */
  public getMonth = (value: Temporal.ZonedDateTime): number => value.month - 1;

  /**
   * Gets the day of the month of the given date.
   * @param value - The given date.
   * @returns The day of the month.
   */
  public getDate = (value: Temporal.ZonedDateTime): number => value.day;

  /**
   * Gets the hours of the given date.
   * @param value - The given date.
   * @returns The hours.
   */
  public getHours = (value: Temporal.ZonedDateTime): number => value.hour;

  /**
   * Gets the minutes of the given date.
   * @param value - The given date.
   * @returns The minutes.
   */
  public getMinutes = (value: Temporal.ZonedDateTime): number => value.minute;

  /**
   * Gets the seconds of the given date.
   * @param value - The given date.
   * @returns The seconds.
   */
  public getSeconds = (value: Temporal.ZonedDateTime): number => value.second;

  /**
   * Gets the milliseconds of the given date.
   * @param value - The given date.
   * @returns The milliseconds.
   */
  public getMilliseconds = (value: Temporal.ZonedDateTime): number => value.millisecond;

  // ---------------------------------------------------------------------------------
  // Setters
  // ---------------------------------------------------------------------------------

  /**
   * Sets the year on a date, constraining out-of-range results rather than
   * overflowing.
   * @param value - The date to change.
   * @param year - The new year.
   * @returns The new date with the year set.
   */
  public setYear = (value: Temporal.ZonedDateTime, year: number): Temporal.ZonedDateTime =>
    value.with({ year }, { overflow: 'constrain' });

  /**
   * Sets the month on a date (0-based, matching `getMonth()`), constraining
   * out-of-range results rather than overflowing.
   * @param value - The date to change.
   * @param month - The new 0-based month.
   * @returns The new date with the month set.
   */
  public setMonth = (value: Temporal.ZonedDateTime, month: number): Temporal.ZonedDateTime =>
    value.with({ month: month + 1 }, { overflow: 'constrain' });

  /**
   * Sets the day of the month on a date, constraining out-of-range results rather
   * than overflowing.
   * @param value - The date to change.
   * @param date - The new day of the month.
   * @returns The new date with the day set.
   */
  public setDate = (value: Temporal.ZonedDateTime, date: number): Temporal.ZonedDateTime =>
    value.with({ day: date }, { overflow: 'constrain' });

  /**
   * Sets the hours on a date, constraining out-of-range results rather than
   * overflowing.
   * @param value - The date to change.
   * @param hours - The new hours.
   * @returns The new date with the hours set.
   */
  public setHours = (value: Temporal.ZonedDateTime, hours: number): Temporal.ZonedDateTime =>
    value.with({ hour: hours }, { overflow: 'constrain' });

  /**
   * Sets the minutes on a date, constraining out-of-range results rather than
   * overflowing.
   * @param value - The date to change.
   * @param minutes - The new minutes.
   * @returns The new date with the minutes set.
   */
  public setMinutes = (value: Temporal.ZonedDateTime, minutes: number): Temporal.ZonedDateTime =>
    value.with({ minute: minutes }, { overflow: 'constrain' });

  /**
   * Sets the seconds on a date, constraining out-of-range results rather than
   * overflowing.
   * @param value - The date to change.
   * @param seconds - The new seconds.
   * @returns The new date with the seconds set.
   */
  public setSeconds = (value: Temporal.ZonedDateTime, seconds: number): Temporal.ZonedDateTime =>
    value.with({ second: seconds }, { overflow: 'constrain' });

  /**
   * Sets the milliseconds on a date, constraining out-of-range results rather than
   * overflowing.
   * @param value - The date to change.
   * @param milliseconds - The new milliseconds.
   * @returns The new date with the milliseconds set.
   */
  public setMilliseconds = (value: Temporal.ZonedDateTime, milliseconds: number): Temporal.ZonedDateTime =>
    value.with({ millisecond: milliseconds }, { overflow: 'constrain' });

  // ---------------------------------------------------------------------------------
  // Week helpers
  // ---------------------------------------------------------------------------------

  /**
   * Gets the number of days in the month of the given date.
   * @param value - The given date.
   * @returns The number of days in the month.
   */
  public getDaysInMonth = (value: Temporal.ZonedDateTime): number => value.daysInMonth;

  /**
   * Builds a nested list of every day of the month of the given date, grouped by
   * week, padded at each end with the trailing/leading days of the adjacent months so
   * every week is a full 7 days — ready to render as a calendar grid.
   * @param value - The given date.
   * @returns A nested list of weeks, each an array of 7 dates.
   */
  public getWeekArray = (value: Temporal.ZonedDateTime): Temporal.ZonedDateTime[][] => {
    const firstDay = this.startOfWeek(this.startOfMonth(value));
    const lastDay = this.endOfWeek(this.endOfMonth(value));

    const days: Temporal.ZonedDateTime[] = [];
    let current = firstDay;
    while (this.isBefore(current, lastDay)) {
      days.push(current);
      current = this.addDays(current, 1);
    }

    const weeks: Temporal.ZonedDateTime[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  /**
   * Gets the ISO 8601 week-of-year number (1–53, Monday-first) of the given date.
   * This is always the ISO week numbering, independent of the adapter's locale — MUI X
   * adapters that support week numbers at all (Luxon among them) follow the same
   * convention.
   * @param value - The given date.
   * @returns The week number.
   */
  public getWeekNumber = (value: Temporal.ZonedDateTime): number =>
    // `weekOfYear` is only `undefined` for calendars without well-defined week
    // numbering; every `AdapterTemporal` value uses the ISO 8601 calendar, which
    // always defines it. The fallback is defensive, not a realistic runtime path.
    value.weekOfYear ?? 1;

  /**
   * Gets the day of the week of the given date, relative to this adapter's locale:
   * `1` is always the locale's first day of the week (from `startOfWeek()`), `7` its
   * last — not necessarily ISO Monday-first. This keeps calendar-grid columns and
   * `startOfWeek()`/`endOfWeek()` aligned regardless of locale.
   * @param value - The given date.
   * @returns The 1-based, locale-relative day of the week.
   */
  public getDayOfWeek = (value: Temporal.ZonedDateTime): number => {
    const firstDay = getFirstDayOfWeek(this.locale);
    return ((value.dayOfWeek - firstDay + 7) % 7) + 1;
  };

  /**
   * Builds a list of every year between the start and end of a range, inclusive.
   * @param range - The `[start, end]` range of years to create.
   * @returns The list of years in the range, each the start of its year.
   */
  public getYearRange = ([start, end]: [Temporal.ZonedDateTime, Temporal.ZonedDateTime]): Temporal.ZonedDateTime[] => {
    const startDate = this.startOfYear(start);
    const endDate = this.endOfYear(end);
    const years: Temporal.ZonedDateTime[] = [];
    let current = startDate;
    while (this.isBefore(current, endDate)) {
      years.push(current);
      current = this.addYears(current, 1);
    }
    return years;
  };
}
