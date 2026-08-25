/**
 * Internal accessor for the ambient `Temporal` global, used only by
 * {@link AdapterTemporal}'s own methods.
 *
 * This is deliberately **not** part of this package's public API. Once
 * {@link createTemporalAdapter} has resolved, `Temporal` is guaranteed to
 * exist as a real global (native or freshly polyfilled by
 * {@link ensureTemporal}), and consumer code is expected to reference
 * `Temporal.*` directly — exactly as TC39/MDN document it — rather than
 * going through a package-specific indirection.
 *
 * @returns The ambient `Temporal` global.
 * @throws If called before `Temporal` has been made available — i.e.
 *   before `await createTemporalAdapter()` has resolved.
 */
export function getTemporal(): typeof Temporal {
  if (typeof globalThis.Temporal === 'undefined') {
    throw new Error(
      '[AdapterTemporal] Temporal is not available yet. Did you forget to ' +
        '`await createTemporalAdapter()` before rendering LocalizationProvider?',
    );
  }

  return globalThis.Temporal;
}
