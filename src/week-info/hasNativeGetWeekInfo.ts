/**
 * Reports whether the current runtime supports `Intl.Locale.prototype.getWeekInfo()`
 * natively.
 *
 * Isolated in its own tiny module — rather than inlined at each of its two call sites
 * (`ensureWeekInfo.ts`/`getFirstDayOfWeek.ts`) — so the disable comment below only has to be
 * written, and justified, once.
 *
 * @returns `true` if `Intl.Locale.prototype.getWeekInfo` is a function.
 */
export function hasNativeGetWeekInfo(): boolean {
  // `Intl.Locale.prototype.getWeekInfo` is declared with a real, non-`any` return type
  // (`WeekInfo`) in TypeScript's own `lib.esnext.intl.d.ts` — confirmed directly via
  // `tsc --noEmit` against this exact expression, which resolves the type correctly (a
  // deliberately-wrong assignment from it is correctly rejected as `WeekInfo`, not `any`).
  // This is specifically a `@typescript-eslint/typescript-estree` checker quirk when reading
  // a member off the `Intl.Locale` *constructor's* `.prototype` (as opposed to off an
  // instance, which type-checks fine either way) under TS 6.x's `esnext.intl` lib — verified
  // as a false positive, not a genuine untyped value.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- see above
  return typeof Intl.Locale.prototype.getWeekInfo === 'function';
}
