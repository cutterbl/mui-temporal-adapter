import { ensureTemporal } from './temporal-runtime/ensureTemporal';
import { ensureWeekInfo } from './week-info/ensureWeekInfo';
import AdapterTemporal from './AdapterTemporal/AdapterTemporal';
import type { AdapterTemporalOptions } from './AdapterTemporal/AdapterTemporal.types';

/**
 * Options for {@link createTemporalAdapter}.
 */
export interface TemporalAdapterOptions {
  /**
   * Force the `temporal-polyfill` path even if the runtime already has native
   * `Temporal` support. Intended for tests and Storybook — lets a story or test
   * deterministically exercise the polyfill branch on any machine.
   */
  forcePolyfill?: boolean;
  /**
   * Force the static first-day-of-week fallback table even if the runtime already
   * supports `Intl.Locale.prototype.getWeekInfo()` natively. Intended for tests and
   * Storybook, same as {@link forcePolyfill}.
   */
  forceWeekInfoFallback?: boolean;
  /**
   * A default locale for the resolved `AdapterTemporal` class to fall back to when a
   * later `new AdapterTemporal(...)` call (e.g. `LocalizationProvider` constructing it
   * internally from its `adapterLocale` prop) doesn't specify one itself. Optional —
   * omit to let `AdapterTemporal` use the runtime's own default locale
   * (`Intl.DateTimeFormat().resolvedOptions().locale`) in that case instead. An
   * explicit `locale`/`adapterLocale` at construction time always wins over this.
   */
  locale?: string;
}

/**
 * The type `createTemporalAdapter()` resolves to: the `AdapterTemporal` class itself,
 * ready to hand directly to `LocalizationProvider`'s `dateAdapter` prop.
 */
export type TemporalAdapterConstructor = new (options?: AdapterTemporalOptions) => AdapterTemporal;

/**
 * Resolves Temporal support for the current runtime — using the native global if
 * present, or lazily loading a small polyfill if not — and resolves locale
 * first-day-of-week support the same way, then returns the `AdapterTemporal` class
 * ready to hand to `LocalizationProvider`.
 *
 * `LocalizationProvider` calls `new AdapterTemporal(...)` internally, synchronously —
 * it can never `await` anything itself. So this factory does all the async setup work
 * up front and resolves to the *class*, not an instance, keeping every
 * `AdapterTemporal` method fully synchronous once it's actually used.
 *
 * @param options - Optional settings; omit to use sensible defaults.
 * @returns A promise that resolves to the `AdapterTemporal` class itself — pass the
 *   resolved value directly to `LocalizationProvider`'s `dateAdapter` prop.
 * @example
 * ```tsx
 * const AdapterTemporal = await createTemporalAdapter();
 * <LocalizationProvider dateAdapter={AdapterTemporal}>
 *   <DatePicker />
 * </LocalizationProvider>
 * ```
 */
export default async function createTemporalAdapter(
  options?: TemporalAdapterOptions,
): Promise<TemporalAdapterConstructor> {
  const { forcePolyfill, forceWeekInfoFallback, locale: factoryDefaultLocale } = options ?? {};

  await Promise.all([
    ensureTemporal(forcePolyfill === undefined ? undefined : { force: forcePolyfill }),
    ensureWeekInfo(forceWeekInfoFallback === undefined ? undefined : { force: forceWeekInfoFallback }),
  ]);

  if (factoryDefaultLocale === undefined) {
    return AdapterTemporal;
  }

  // Re-bind to a `string`-typed const: closures don't retain the narrowing TS just
  // applied to `factoryDefaultLocale` above (it stays `string | undefined` inside the
  // constructor below otherwise, which trips `exactOptionalPropertyTypes`).
  const resolvedDefaultLocale: string = factoryDefaultLocale;

  // Layer the factory-level default locale underneath AdapterTemporal's own
  // runtime-default fallback — an explicit `locale`/`adapterLocale` passed to a later
  // `new AdapterTemporal(...)` call still wins over both.
  return class extends AdapterTemporal {
    constructor(instanceOptions?: AdapterTemporalOptions) {
      super({ locale: resolvedDefaultLocale, ...instanceOptions });
    }
  };
}
