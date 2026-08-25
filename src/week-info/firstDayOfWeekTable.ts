/**
 * A small, hand-maintained table of which day of the week a calendar
 * starts on, for regions where it's *not* the worldwide-default Monday —
 * used only as a fallback when the runtime doesn't support
 * `Intl.Locale.prototype.getWeekInfo()` (see `ensureWeekInfo.ts`).
 *
 * Values follow the same numbering `Intl.Locale#getWeekInfo()` itself
 * uses: 1 = Monday … 7 = Sunday (ISO 8601 weekday numbers). Sourced from
 * the same general CLDR week-data that backs the native API, so the two
 * paths agree on every region listed here.
 *
 * This is deliberately **not** an exhaustive CLDR mirror — only regions
 * that differ from the Monday default are listed. Any region not listed
 * here falls back to Monday (see `getFirstDayOfWeek.ts`), which is both
 * the ISO 8601 default and the CLDR default for most of the world.
 */
export const firstDayOfWeekByRegion: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
  // Sunday-start regions.
  US: 7,
  CA: 7,
  MX: 7,
  BR: 7,
  JP: 7,
  KR: 7,
  TW: 7,
  HK: 7,
  PH: 7,
  TH: 7,
  IL: 7,
  ZA: 7,
  CO: 7,
  VE: 7,
  PE: 7,
  DO: 7,

  // Saturday-start regions (mostly the Middle East / North Africa).
  EG: 6,
  SA: 6,
  AE: 6,
  QA: 6,
  KW: 6,
  BH: 6,
  OM: 6,
  JO: 6,
  SY: 6,
  IQ: 6,
  DZ: 6,
  MA: 6,
  TN: 6,
  LY: 6,
  YE: 6,
  AF: 6,
};
