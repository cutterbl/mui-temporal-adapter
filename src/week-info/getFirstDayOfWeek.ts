import { fallbackTable, forced } from './ensureWeekInfo';
import { DEFAULT_FIRST_DAY } from './firstDayOfWeekTable';

/**
 * Resolves which day of the week a calendar should start on for a given
 * locale — using the runtime's native `Intl.Locale.prototype.getWeekInfo()`
 * when available, or the small fallback table loaded by `ensureWeekInfo()`
 * otherwise.
 *
 * Call `ensureWeekInfo()` first (once, during `createTemporalAdapter()`) —
 * this function itself is synchronous, since `AdapterTemporal`'s methods
 * that need it (`startOfWeek`, `getWeekArray`, …) are synchronous too.
 *
 * @param localeCode - A BCP 47 locale tag, e.g. `'en-US'` or `'fr-FR'`.
 * @returns The first day of the week as an ISO 8601 weekday number:
 *   1 = Monday … 7 = Sunday.
 * @example
 * ```ts
 * getFirstDayOfWeek('en-US'); // 7 (Sunday)
 * getFirstDayOfWeek('fr-FR'); // 1 (Monday)
 * ```
 */
export function getFirstDayOfWeek(localeCode: string): number {
  const hasNative = typeof Intl.Locale.prototype.getWeekInfo === 'function';

  if (hasNative && !forced) {
    return new Intl.Locale(localeCode).getWeekInfo().firstDay;
  }

  if (!fallbackTable) {
    // ensureWeekInfo() hasn't loaded the fallback yet — safe default
    // rather than throwing, since this can legitimately be called before
    // the fallback import resolves in edge cases (e.g. direct unit tests).
    return DEFAULT_FIRST_DAY;
  }

  // The fallback table is keyed by region (e.g. "US", "FR"), not by full
  // locale tag or bare language — `maximize()` fills in the likely region
  // for locale tags that don't specify one (e.g. "fr" -> "FR").
  const region = new Intl.Locale(localeCode).maximize().region;
  const value = region ? fallbackTable[region] : undefined;
  return value ?? DEFAULT_FIRST_DAY;
}
