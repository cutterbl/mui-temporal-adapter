import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// `package.json` is ESM (`"type": "module"`), so this config has no `__dirname` of its
// own — reconstruct it from `import.meta.url`, the standard ESM equivalent.
const rootDir = fileURLToPath(new URL('.', import.meta.url));

/**
 * Multi-entry library build: one output file (plus a matching declaration file) per
 * public module, required for true subpath imports under `package.json`'s `exports`
 * map (e.g. `@cxing/mui-temporal-adapter/AdapterTemporal`) — a single bundled barrel
 * file wouldn't satisfy that map's flat `./*` wildcard pattern.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      // Declarations mirror `src/`'s own directory structure relative to `src/`
      // itself (the default `entryRoot`) — which is exactly why every build-entry
      // source file below is a *flat*, root-level file (`src/AdapterTemporal.ts`,
      // not the nested `src/AdapterTemporal/AdapterTemporal.ts` it re-exports):
      // each entry's own declaration file lands flat in `dist/` too (e.g.
      // `dist/AdapterTemporal.d.ts` next to `dist/AdapterTemporal.js`), matching the
      // flat `./*` wildcard in `package.json`'s `exports` map. Non-entry internal
      // modules still emit nested (e.g. `dist/format/formatByToken.d.ts`) — harmless,
      // since only the flat entry `.d.ts` files are ever referenced by `exports`; an
      // earlier `bundleTypes: true` (API Extractor) approach was tried first and hit
      // an API Extractor limitation resolving the `Promise` symbol — this simpler,
      // no-extra-tool approach was adopted instead; see `DECISIONS.md`.
      include: ['src'],
    }),
  ],
  build: {
    target: 'es2024',
    lib: {
      entry: {
        index: resolve(rootDir, 'src/index.ts'),
        createTemporalAdapter: resolve(rootDir, 'src/createTemporalAdapter.ts'),
        AdapterTemporal: resolve(rootDir, 'src/AdapterTemporal.ts'),
        TemporalLocalizationProvider: resolve(rootDir, 'src/TemporalLocalizationProvider.tsx'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/x-date-pickers',
        '@emotion/react',
        '@emotion/styled',
      ],
      // `temporal-polyfill` and the week-info fallback table stay un-externalized so
      // their dynamic `import()`s land as genuine on-demand chunks in `dist/`, shared
      // across whichever entry references them — not duplicated per entry, and never
      // pulled in eagerly for consumers whose runtime already has native support.
    },
  },
});
