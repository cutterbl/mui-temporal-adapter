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
 * @param opts.force - Testing/Storybook only. When `true`, always installs
 *   the polyfill's own implementation, even if a native `Temporal` global is
 *   already present — used to deterministically exercise the polyfill path
 *   in environments that do have native support. Implemented by importing
 *   `temporal-polyfill/implementation` (the polyfill's own `Temporal`,
 *   exported unconditionally) and assigning it onto `globalThis` ourselves,
 *   rather than relying on the package's self-installing `/global` entry
 *   point: that entry point decides once, the first time it's ever
 *   evaluated, whether to install — and because a dynamic `import()` of an
 *   already-loaded module doesn't re-run its top-level code, a later
 *   `force: true` call can't make it reconsider. Doing the assignment
 *   ourselves means it's correct no matter how many times this has already
 *   been called, or with what result.
 * @example
 * ```ts
 * await ensureTemporal();
 * Temporal.Now.zonedDateTimeISO(); // safe to use from here on
 * ```
 */
export async function ensureTemporal(opts?: { force?: boolean }): Promise<void> {
  if (!opts?.force && typeof globalThis.Temporal !== 'undefined') {
    return;
  }

  // Code-split chunk: only ever fetched by runtimes that actually need it (native
  // support absent, or force-requested).
  const { Temporal: polyfillTemporal } = await import('temporal-polyfill/implementation');
  (globalThis as { Temporal?: typeof Temporal }).Temporal = polyfillTemporal;
}
