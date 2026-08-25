import { SUPPORTED_FIELD_TOKENS } from './fieldTokens';
import { tokenizeFormat } from './tokenizeFormat';

/** The locale-macro tokens `expandFormat()` (and `formatByToken()`) know how to expand. */
export const MACRO_TOKENS = ['D', 'DD', 'T'] as const;
export type MacroToken = (typeof MACRO_TOKENS)[number];

/**
 * Wraps literal text in `'single quotes'` (escaping any literal quote inside as `''`,
 * matching `tokenizeFormat()`'s own convention) — but only when it actually needs it,
 * i.e. it contains a letter that could otherwise be mistaken for a format token on a
 * later `tokenizeFormat()` pass. Punctuation, digits, and whitespace are safe as-is.
 * @param value - The literal text to quote if needed.
 * @returns `value`, quoted if it contains a letter, unchanged otherwise.
 */
function quoteLiteral(value: string): string {
  if (!/[a-zA-Z]/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Expands one locale-macro token (`D`, `DD`, `T`) into the token/literal sequence
 * that reproduces this locale's own field order and punctuation for it — e.g. `D` in
 * `en-US` expands to a sequence equivalent to `"M/d/yyyy"`, while in `de-DE` it
 * expands to the equivalent of `"d.M.yyyy"`.
 *
 * The actual field *tokens* chosen (`yyyy`, `M` vs. `MM`, `h` vs. `H`, …) come from a
 * fixed table below, not from inspecting formatted digits — a locale's ordering and
 * separators can vary, but "year is always 4 digits" etc. is a property of the
 * options this function itself requests, which it already knows. Only the *order*
 * and the *literal separator text* between fields are read back from
 * `Intl.DateTimeFormat`, via `formatToParts()` against an arbitrary fixed reference
 * instant (the specific instant is irrelevant — only which locale-defined field order
 * and separators it renders with matters, and those don't vary by instant).
 *
 * Exported (not just used internally by `expandFormat()`) so `formatByToken()` can
 * reuse it directly for its own `D`/`DD`/`T` cases — rendering a macro token by
 * expanding it into field tokens and formatting *those* keeps digit output plain
 * ASCII (see `formatByToken.ts`), instead of `Intl`'s locale-native numbering system
 * (e.g. Arabic-Indic digits for `ar-SA`), which this engine's own parser can't read
 * back.
 *
 * @param macro - Which macro token to expand.
 * @param locale - The locale whose field order/separators/hour-cycle to use.
 * @returns The expanded token/literal sequence, as a format string.
 */
export function expandMacroToken(macro: MacroToken, locale: string): string {
  if (macro === 'T') {
    const hour12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ?? false;
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12 };
    return partsToFormat(locale, options, (part) => {
      switch (part.type) {
        // `part.value.length` reflects whether *this locale's* "numeric" hour style
        // happens to be zero-padded — not assumed, since it varies by locale/CLDR.
        // Read at a reference hour of 1 (never "12"), so a length of 2 unambiguously
        // means padding, not just a naturally two-digit hour.
        case 'hour':
          return (hour12 ? 'h' : 'H').repeat(part.value.length >= 2 ? 2 : 1);
        case 'minute':
          return 'mm';
        case 'dayPeriod':
          return 'a';
        default:
          return '';
      }
    });
  }

  const options: Intl.DateTimeFormatOptions =
    macro === 'D'
      ? { year: 'numeric', month: 'numeric', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  return partsToFormat(locale, options, (part) => {
    switch (part.type) {
      case 'year':
        return 'yyyy';
      case 'month':
        // `D`'s month is numeric (pad-length read from the rendered digits, same
        // reasoning as `hour` above); `DD`'s is always the short name.
        return macro === 'D' ? 'M'.repeat(part.value.length >= 2 ? 2 : 1) : 'MMM';
      case 'day':
        return 'd'.repeat(part.value.length >= 2 ? 2 : 1);
      default:
        return '';
    }
  });
}

/**
 * Renders `Intl.DateTimeFormat(locale, options).formatToParts(...)`'s field ordering
 * and literal separators into a format string, mapping each non-literal part to a
 * token via `tokenFor`. Pinned to UTC against a fixed reference instant chosen to be
 * unambiguous for detecting locale-specific zero-padding (day 1, month January, hour
 * 1 — each naturally single-digit unpadded, so a 2-character rendered part means the
 * locale genuinely zero-pads that field, not just that the value happened to need two
 * digits). The ordering/punctuation/padding `Intl` chooses for a given `options` shape
 * in a given locale doesn't depend on the zone or which instant, only on
 * `locale`/`options` themselves — so this one fixed reference is enough for any date.
 * @param locale - The locale to read field order/separators/padding from.
 * @param options - The `Intl.DateTimeFormatOptions` describing which fields to include.
 * @param tokenFor - Maps an `Intl.DateTimeFormatPart` (type *and* rendered value, so
 *   padding can be detected) to the token that represents it (return `''` for a part
 *   type this call site doesn't expect).
 * @returns The assembled token/literal format string.
 */
function partsToFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions,
  tokenFor: (part: Intl.DateTimeFormatPart) => string,
): string {
  const reference = new Date(Date.UTC(1970, 0, 1, 1, 0, 0));
  const parts = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).formatToParts(reference);
  return parts.map((part) => (part.type === 'literal' ? quoteLiteral(part.value) : tokenFor(part))).join('');
}

/**
 * Expands a format string with no meta-tokens into one with only literal and
 * field tokens — the form `formatByToken()`/`parseByToken()` operate on directly.
 *
 * Two things happen here: the locale-macro tokens `D`/`DD`/`T` (used by several of
 * `AdapterTemporal`'s own `defaultFormats`, e.g. `keyboardDate: 'D'`) get expanded
 * into this locale's own field order (see `expandMacroToken()`); and any stray,
 * unquoted run of letters that isn't a token this adapter recognizes gets
 * auto-wrapped as a literal, on the assumption it's plain text a consumer forgot to
 * quote (e.g. writing `"'at' HH:mm"` as `"at HH:mm"`) rather than a typo'd token —
 * matching `AdapterLuxon`'s own leniency here.
 *
 * @param format - The format string to expand.
 * @param locale - The locale to expand macro tokens in.
 * @returns The expanded format string.
 * @example
 * ```ts
 * adapter.expandFormat('D'); // e.g. "M/d/yyyy" (en-US) or "d.M.yyyy" (de-DE)
 * ```
 */
export function expandFormat(format: string, locale: string): string {
  return tokenizeFormat(format)
    .map((tok) => {
      if (tok.literal) {
        return quoteLiteral(tok.value);
      }
      if ((MACRO_TOKENS as readonly string[]).includes(tok.value)) {
        return expandMacroToken(tok.value as MacroToken, locale);
      }
      if (SUPPORTED_FIELD_TOKENS.has(tok.value)) {
        return tok.value;
      }
      return quoteLiteral(tok.value);
    })
    .join('');
}
