import { use } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { LocalizationProviderProps } from '@mui/x-date-pickers/LocalizationProvider';
import createTemporalAdapter from '../createTemporalAdapter';
import type { TemporalAdapterConstructor, TemporalAdapterOptions } from '../createTemporalAdapter';

/**
 * Props for {@link TemporalLocalizationProvider}.
 */
export interface TemporalLocalizationProviderProps extends Omit<
  LocalizationProviderProps<string>,
  'dateAdapter'
> {
  /**
   * Force the `temporal-polyfill` path even if the runtime already has native
   * `Temporal` support. Intended for tests and Storybook only — lets a story or test
   * deterministically exercise the polyfill branch on any machine.
   */
  forcePolyfill?: boolean;
  /**
   * Force the static first-day-of-week fallback table even if the runtime already
   * supports `Intl.Locale.prototype.getWeekInfo()` natively. Intended for tests and
   * Storybook only, same as {@link forcePolyfill}.
   */
  forceWeekInfoFallback?: boolean;
}

/**
 * One memoized `createTemporalAdapter()` call per distinct combination of the two
 * force-flags above, keyed by `Boolean(flag)` (so an explicit `false` and an omitted
 * flag — behaviorally identical, both mean "use real feature detection" — share a
 * cache entry). `use()` requires a *stable* promise reference across renders: a fresh
 * promise every render would re-suspend forever. So every mount sharing the same
 * flags shares one resolution, and only the first triggers the underlying dynamic
 * imports. Bounded to at most 4 entries (2 booleans) for the lifetime of the module —
 * never grows further, so this is not an unbounded cache.
 */
const adapterPromises = new Map<string, Promise<TemporalAdapterConstructor>>();

/**
 * Looks up (or starts, and caches) the `createTemporalAdapter()` promise for a given
 * pair of force-flags. See {@link adapterPromises}.
 * @param forcePolyfill - Forwarded to `createTemporalAdapter()`; see
 *   {@link TemporalLocalizationProviderProps.forcePolyfill}.
 * @param forceWeekInfoFallback - Forwarded to `createTemporalAdapter()`; see
 *   {@link TemporalLocalizationProviderProps.forceWeekInfoFallback}.
 * @returns The cached (or newly-started) promise for this flag combination.
 */
function getAdapterPromise(
  forcePolyfill: boolean | undefined,
  forceWeekInfoFallback: boolean | undefined,
): Promise<TemporalAdapterConstructor> {
  const key = `${Boolean(forcePolyfill)}:${Boolean(forceWeekInfoFallback)}`;
  const cached = adapterPromises.get(key);
  if (cached) {
    return cached;
  }
  // Built up conditionally (rather than `{ forcePolyfill, forceWeekInfoFallback }`
  // directly) so an omitted flag stays an *omitted* key, not a key explicitly set to
  // `undefined` — required by `exactOptionalPropertyTypes`.
  const options: TemporalAdapterOptions = {
    ...(forcePolyfill !== undefined && { forcePolyfill }),
    ...(forceWeekInfoFallback !== undefined && { forceWeekInfoFallback }),
  };
  const promise = createTemporalAdapter(options);
  adapterPromises.set(key, promise);
  return promise;
}

/**
 * Convenience wrapper around `createTemporalAdapter()` + MUI X's own
 * `LocalizationProvider`, built on React 19's `use()` hook — the standard, documented
 * mechanism for "await a resource, then render" — rather than a bespoke
 * `useEffect`/loading-state implementation.
 *
 * Wrap it in a `<Suspense fallback={...}>` boundary yourself (and an Error Boundary,
 * if you want one): this component intentionally has no `fallback`/`onError` props of
 * its own. `use()` suspends into the nearest Suspense boundary while the adapter is
 * still resolving, and re-throws a rejected promise into the nearest Error Boundary
 * automatically — this keeps the component's own API surface small and matches
 * standard React 19 async-resource patterns instead of inventing a parallel one.
 *
 * `locale` isn't one of this component's own props — pass `adapterLocale` (forwarded
 * straight through to `LocalizationProvider`) instead. Changing it on a later render
 * is a normal synchronous re-render: it only affects the *synchronous*
 * `AdapterTemporal` constructor, not the async factory this component resolves once.
 *
 * @param props - Forwarded to `LocalizationProvider` (minus `dateAdapter`, which this
 *   component resolves itself), plus `forcePolyfill`/`forceWeekInfoFallback` for tests
 *   and Storybook.
 * @returns A `LocalizationProvider` wired to the resolved `AdapterTemporal` class.
 * @example
 * ```tsx
 * <Suspense fallback={<Spinner />}>
 *   <TemporalLocalizationProvider>
 *     <DatePicker />
 *   </TemporalLocalizationProvider>
 * </Suspense>
 * ```
 */
export default function TemporalLocalizationProvider({
  forcePolyfill,
  forceWeekInfoFallback,
  ...localizationProviderProps
}: TemporalLocalizationProviderProps) {
  const ResolvedAdapterTemporal = use(getAdapterPromise(forcePolyfill, forceWeekInfoFallback));
  return (
    <LocalizationProvider dateAdapter={ResolvedAdapterTemporal} {...localizationProviderProps} />
  );
}
