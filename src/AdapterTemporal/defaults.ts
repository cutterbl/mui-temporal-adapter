import type { AdapterFormats, FieldFormatTokenMap } from '@mui/x-date-pickers/models';

/**
 * Maps every format token `AdapterTemporal` understands to the field metadata
 * `@mui/x-date-pickers`'s keyboard-editable fields (`DateField`, `TimeField`, etc.) need
 * to render and navigate individual sections (year, month, day, ...).
 *
 * `AdapterTemporal` adopts the same Luxon-style token vocabulary (`yyyy`, `MM`, `dd`,
 * `EEEE`, `HH`, `mm`, `ss`, `a`, ...) that `AdapterLuxon` uses — Temporal has no built-in
 * format-string engine of its own, so this package builds one (see
 * `src/format/tokenizeFormat.ts` and friends), and reusing an established, well-understood
 * token set keeps that engine's behavior predictable for anyone coming from another
 * MUI X adapter.
 */
export const formatTokenMap: FieldFormatTokenMap = {
  // Year
  y: { sectionType: 'year', contentType: 'digit', maxLength: 4 },
  yy: 'year',
  yyyy: { sectionType: 'year', contentType: 'digit', maxLength: 4 },
  // Month
  L: { sectionType: 'month', contentType: 'digit', maxLength: 2 },
  LL: 'month',
  LLL: { sectionType: 'month', contentType: 'letter' },
  LLLL: { sectionType: 'month', contentType: 'letter' },
  M: { sectionType: 'month', contentType: 'digit', maxLength: 2 },
  MM: 'month',
  MMM: { sectionType: 'month', contentType: 'letter' },
  MMMM: { sectionType: 'month', contentType: 'letter' },
  // Day of the month
  d: { sectionType: 'day', contentType: 'digit', maxLength: 2 },
  dd: 'day',
  // Day of the week
  c: { sectionType: 'weekDay', contentType: 'digit', maxLength: 1 },
  ccc: { sectionType: 'weekDay', contentType: 'letter' },
  cccc: { sectionType: 'weekDay', contentType: 'letter' },
  E: { sectionType: 'weekDay', contentType: 'digit', maxLength: 2 },
  EEE: { sectionType: 'weekDay', contentType: 'letter' },
  EEEE: { sectionType: 'weekDay', contentType: 'letter' },
  // Meridiem
  a: 'meridiem',
  // Hours
  H: { sectionType: 'hours', contentType: 'digit', maxLength: 2 },
  HH: 'hours',
  h: { sectionType: 'hours', contentType: 'digit', maxLength: 2 },
  hh: 'hours',
  // Minutes
  m: { sectionType: 'minutes', contentType: 'digit', maxLength: 2 },
  mm: 'minutes',
  // Seconds
  s: { sectionType: 'seconds', contentType: 'digit', maxLength: 2 },
  ss: 'seconds',
};

/**
 * The default named formats every `AdapterTemporal` instance starts with, expressed in
 * the token vocabulary from {@link formatTokenMap}. Consumers can override any subset of
 * these via the `formats` constructor option.
 */
export const defaultFormats: AdapterFormats = {
  year: 'yyyy',
  month: 'LLLL',
  monthShort: 'MMM',
  dayOfMonth: 'd',
  dayOfMonthFull: 'd',
  weekday: 'cccc',
  weekdayShort: 'ccccc',
  hours24h: 'HH',
  hours12h: 'hh',
  meridiem: 'a',
  minutes: 'mm',
  seconds: 'ss',
  fullDate: 'DD',
  keyboardDate: 'D',
  shortDate: 'MMM d',
  normalDate: 'd MMMM',
  normalDateWithWeekday: 'EEE, MMM d',
  fullTime12h: 'hh:mm a',
  fullTime24h: 'HH:mm',
  keyboardDateTime12h: 'D hh:mm a',
  keyboardDateTime24h: 'D T',
};
