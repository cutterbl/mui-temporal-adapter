/**
 * Every field-level format token `formatByToken()`/`parseByToken()` understand how to
 * render or read — one editable-section's worth of a date, e.g. `'yyyy'` or `'MMMM'`.
 * A superset of `AdapterTemporal.formatTokenMap`'s keys (see `defaults.ts`) — that map
 * only lists the tokens MUI X's keyboard-editable fields need section metadata for;
 * `ccccc` (narrow weekday name) is a real, formattable/parseable token too, just not
 * one a field ever renders as its own editable section.
 *
 * Doesn't include the locale-macro tokens `D`/`DD`/`T` (see `expandFormat.ts`) — each
 * of those expands into a *sequence* of these field tokens, not a single section.
 *
 * Its own module so both `formatByToken.ts` (which needs the macro tokens' *expanded*
 * field-token sequence to render them with plain, parseable digits — see there) and
 * `expandFormat.ts` (which needs to tell a real field token from a stray word to
 * auto-quote) can depend on it without importing from each other.
 */
export const SUPPORTED_FIELD_TOKENS: ReadonlySet<string> = new Set([
  'y',
  'yy',
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
  'ccc',
  'cccc',
  'ccccc',
  'E',
  'EEE',
  'EEEE',
  'a',
  'H',
  'HH',
  'h',
  'hh',
  'm',
  'mm',
  's',
  'ss',
]);
