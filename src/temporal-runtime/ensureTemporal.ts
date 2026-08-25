/**
 * Makes sure `Temporal` exists as a real, ambient global — `globalThis.Temporal`
 * — before any code tries to use it.
 *
 * If the current JavaScript runtime already has `Temporal` built in, this
 * does nothing (the runtime's own copy is used as-is). If it doesn't, this
 * lazily loads a small polyfill and installs it onto `globalThis.Temporal`
 * itself, so afterwards `Temporal.PlainDate.from(...)` and friends work
 * exactly as TC39/MDN document them, with no special import required.
 *
 * Safe to call more than once: once `Temporal` is available (native or
 * polyfilled), later calls resolve immediately without loading anything
 * again.
 *
 * @param opts - Optional settings.
 * @param opts.force - Testing/Storybook only. When `true`, always loads the
 *   polyfill, even if a native `Temporal` global is already present. Used to
 *   deterministically exercise the polyfill path in environments that do
 *   have native support. Note: `temporal-polyfill`'s own installer treats
 *   *any* existing `globalThis.Temporal` as "native" and refuses to
 *   overwrite it (it reads `globalThis.Temporal` generically, not a true
 *   engine-native check) — so forcing genuinely requires clearing the
 *   global first, which this option does.
 * @example
 * ```ts
 * await ensureTemporal();
 * Temporal.Now.zonedDateTimeISO(); // safe to use from here on
 * ```
 */
export async function ensureTemporal(opts?: { force?: boolean }): Promise<void> {
  if (opts?.force) {
    // temporal-polyfill's installer bails if `globalThis.Temporal` is
    // already set to *anything* — clear it first so the import below
    // genuinely (re-)installs instead of silently no-op'ing.
    delete (globalThis as { Temporal?: typeof Temporal }).Temporal;
  } else if (typeof globalThis.Temporal !== 'undefined') {
    return;
  }

  // Code-split chunk: only ever fetched by runtimes that actually need it.
  // The `/global` entry point is a self-installing side-effect import — it
  // assigns its `Temporal` implementation onto `globalThis` itself, which
  // is exactly what we want here (see getTemporal.ts for why).
  await import('temporal-polyfill/global');
}
