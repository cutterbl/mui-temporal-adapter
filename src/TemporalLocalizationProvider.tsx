// Flat, root-level re-export of the real implementation in
// `./TemporalLocalizationProvider/`. See `src/AdapterTemporal.ts` for why this
// indirection exists — the same reasoning applies here.
export { default } from './TemporalLocalizationProvider/TemporalLocalizationProvider';
export type { TemporalLocalizationProviderProps } from './TemporalLocalizationProvider/TemporalLocalizationProvider';
