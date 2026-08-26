import type { firstDayOfWeekByRegion } from './firstDayOfWeekTable';
import { hasNativeGetWeekInfo } from './hasNativeGetWeekInfo';

/**
 * The loaded fallback table, once (and if) it's been imported. Exported as
 * a live binding so `getFirstDayOfWeek.ts` always sees the current value —
 * `undefined` until `ensureWeekInfo()` has actually loaded it.
 */
export let fallbackTable: typeof firstDayOfWeekByRegion | undefined;

/**
 * Whether the fallback table should be used even when the runtime *does*
 * support `Intl.Locale.prototype.getWeekInfo()` natively — set by a
 * `force: true` call, and left on for the rest of the session once set
 * (matching how `ensureTemporal`'s forcing works: this is a testing/demo
 * knob, not something that toggles back and forth at runtime).
 */
export let forced = false;

/**
 * Makes sure locale-aware first-day-of-week information is available —
 * either because the runtime already supports
 * `Intl.Locale.prototype.getWeekInfo()` natively, or because this lazily
 * loaded a small fallback table to stand in for it.
 *
 * Temporal itself has no concept of a locale-aware week (only the ISO
 * week, which always starts on Monday) — this is what lets
 * `AdapterTemporal`'s `startOfWeek`/`getWeekArray` actually respect each
 * locale's own convention. See `getFirstDayOfWeek.ts` for how the result
 * is used.
 *
 * @param opts - Optional settings.
 * @param opts.force - Testing/Storybook only. When `true`, always loads
 *   and uses the fallback table, even when native `getWeekInfo()` support
 *   is available — used to deterministically exercise the fallback path.
 * @example
 * ```ts
 * await ensureWeekInfo();
 * getFirstDayOfWeek('fr-FR'); // now resolves correctly either way
 * ```
 */
export async function ensureWeekInfo(opts?: { force?: boolean }): Promise<void> {
  if (opts?.force) {
    forced = true;
  }

  const hasNative = hasNativeGetWeekInfo();
  if (!forced && hasNative) {
    return;
  }

  if (fallbackTable) {
    return;
  }

  // Code-split chunk: only ever fetched by runtimes that actually need it
  // (or when explicitly forced for a demo).
  ({ firstDayOfWeekByRegion: fallbackTable } = await import('./firstDayOfWeekTable'));
}
