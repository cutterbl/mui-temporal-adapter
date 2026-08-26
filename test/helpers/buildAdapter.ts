import createTemporalAdapter from '../../src/createTemporalAdapter';
import type AdapterTemporal from '../../src/AdapterTemporal/AdapterTemporal';
import type { AdapterTemporalOptions } from '../../src/AdapterTemporal/AdapterTemporal.types';

/**
 * Memoized `createTemporalAdapter()` call, shared by every test in whichever file imports
 * this helper. Vitest isolates each test *file* into its own module registry by default, so
 * this cache never leaks across files — it just avoids re-running the async factory (and its
 * `Temporal`/week-info feature-detection) once per `it()` within a single file.
 */
let adapterClassPromise: ReturnType<typeof createTemporalAdapter> | undefined;

/**
 * Resolves (once per test file) the `AdapterTemporal` class via the same public entry point a
 * real consumer uses, then constructs an instance with it — the adapter unit tests exercise
 * `AdapterTemporal` exactly as `createTemporalAdapter()` hands it out, not a bespoke
 * test-only construction path.
 * @param options - Forwarded to the `AdapterTemporal` constructor, e.g. `{ locale: 'fr-FR' }`.
 * @returns A ready-to-use `AdapterTemporal` instance.
 */
export async function buildAdapter(options?: AdapterTemporalOptions): Promise<AdapterTemporal> {
  adapterClassPromise ??= createTemporalAdapter();
  const AdapterTemporalClass = await adapterClassPromise;
  return new AdapterTemporalClass(options);
}
