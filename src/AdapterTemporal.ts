// Flat, root-level re-export of the real implementation in `./AdapterTemporal/`. This
// file — not the nested one — is what `vite.config.ts`'s `AdapterTemporal` build entry
// points to, so both the emitted JS chunk *and* its declaration file land flat in
// `dist/` (`dist/AdapterTemporal.js` / `.d.ts`), matching the flat `./*` wildcard in
// `package.json`'s `exports` map — subpath imports like
// `@cxing/mui-temporal-adapter/AdapterTemporal` resolve correctly. See
// `DECISIONS.md` for why (a `vite-plugin-dts` multi-entry `.d.ts` emission spike).
export { default } from './AdapterTemporal/AdapterTemporal';
export type { AdapterTemporalOptions } from './AdapterTemporal/AdapterTemporal.types';
