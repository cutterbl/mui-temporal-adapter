/**
 * One piece of a parsed format string: either a run of literal text to reproduce
 * as-is (already stripped of its surrounding `'quotes'`, if any), or a run of the
 * same repeated letter representing a format token (e.g. `'yyyy'`, `'MMM'`) whose
 * meaning is resolved elsewhere (see `formatByToken.ts` / `parseByToken.ts`).
 */
export interface FormatToken {
  /** `true` for literal text, `false` for a format token. */
  literal: boolean;
  /** The literal text (with escaped quotes already resolved), or the token itself. */
  value: string;
}

/**
 * Splits a format string (Luxon-style tokens, e.g. `"yyyy-MM-dd"`, `"EEE, MMM d"`)
 * into an ordered list of literal-text and format-token pieces.
 *
 * A run of the same letter (e.g. `yyyy`, `MMM`) becomes one token piece — what that
 * token *means* isn't this function's concern, only where the format string's tokens
 * and literal text fall. Anything wrapped in `'single quotes'` is literal text,
 * reproduced verbatim (with `''` inside a quoted run — or standing alone — meaning a
 * literal apostrophe, matching `AdapterTemporal.escapedCharacters`); an unterminated
 * quote runs to the end of the string. Any other character (spaces, punctuation,
 * digits) is literal text too, with no quoting needed.
 *
 * @param format - The format string to split.
 * @returns The ordered literal/token pieces that make up `format`.
 * @example
 * ```ts
 * tokenizeFormat("yyyy-MM-dd");
 * // [{ literal: false, value: 'yyyy' }, { literal: true, value: '-' },
 * //  { literal: false, value: 'MM' }, { literal: true, value: '-' },
 * //  { literal: false, value: 'dd' }]
 * ```
 */
export function tokenizeFormat(format: string): FormatToken[] {
  const tokens: FormatToken[] = [];
  let i = 0;

  while (i < format.length) {
    // `format.length` was just checked, so this index is always in range — the
    // `?? ''` is purely to satisfy `noUncheckedIndexedAccess`, never a real fallback.
    const char = format[i] ?? '';

    if (char === "'") {
      const start = i;
      let literal = '';
      let j = i + 1;
      while (j < format.length) {
        const current = format[j] ?? '';
        if (current === "'") {
          if ((format[j + 1] ?? '') === "'") {
            literal += "'";
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        literal += current;
        j += 1;
      }
      // A standalone `''` (nothing consumed as content) is itself the escape for one
      // literal apostrophe, not an empty literal run.
      tokens.push({ literal: true, value: literal === '' && j - start === 2 ? "'" : literal });
      i = j;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let j = i + 1;
      while (j < format.length && format[j] === char) {
        j += 1;
      }
      tokens.push({ literal: false, value: format.slice(i, j) });
      i = j;
      continue;
    }

    let j = i + 1;
    while (j < format.length && format[j] !== "'" && !/[a-zA-Z]/.test(format[j] ?? '')) {
      j += 1;
    }
    tokens.push({ literal: true, value: format.slice(i, j) });
    i = j;
  }

  return tokens;
}
