# AdapterTemporal — Temporal-API dateAdapter for MUI X Date Pickers (`@cxing/mui-temporal-adapter`)

> Snapshot of the approved plan, copied into the repo at the start of implementation (Milestone 0).
> This file is the durable, in-repo source of truth — the original Claude Code plan file lives
> outside the repo (`~/.claude/plans/`) and isn't visible to future sessions or collaborators.
> Not edited turn-to-turn during implementation; if scope genuinely changes, log the change (and
> why) in `DECISIONS.md` rather than silently rewriting this file. Progress against this plan is
> tracked in `PROGRESS.md`.

## Context

MUI X Date Pickers ships adapters for Dayjs, date-fns, Luxon, and Moment, each wrapping a third-party date library. We're adding a fifth adapter backed directly by the **TC39 Temporal API** instead of a library, so consumers can drop legacy date libraries entirely once their runtime supports Temporal natively. Because Temporal (native, shipped in Chrome 144 / Node 26 as of early 2026) and locale-aware first-day-of-week (`Intl.Locale#getWeekInfo`) are both still inconsistently available across browsers, the adapter must transparently and lazily polyfill each capability only when the runtime lacks it, so evergreen environments pay zero extra bytes.

This is a brand-new package, built from an empty folder, meant to be a clean, testable, documented, publishable library (TS + Vite + Vitest + Storybook + ESLint/Prettier), all on latest-major tooling.

## Key architectural decisions (already settled)

1. **`TDate = Temporal.ZonedDateTime`** — carries date + time + IANA zone together, the only Temporal type that cleanly covers DatePicker/TimePicker/DateTimePicker plus MUI's timezone-aware adapter methods through one type.
2. **Async factory, not an async instance.** MUI's `LocalizationProvider` types `dateAdapter` as `new (...args) => MuiPickersAdapter<TLocale>` and calls `new DateAdapter(...)` **synchronously** internally — it can never `await` anything. So the public entry point is:
   ```ts
   const AdapterTemporal = await createTemporalAdapter(); // resolves native Temporal / lazily loads polyfill, resolves locale week-info
   <LocalizationProvider dateAdapter={AdapterTemporal}>   // MUI calls `new AdapterTemporal(...)` itself, synchronously, no await needed here
   ```
   `createTemporalAdapter()` does all async setup (feature-detect `globalThis.Temporal`; if absent, dynamically import the polyfill's self-installing global entry point, code-split; check native week-info support, and if absent, dynamically import the fallback table) and resolves to the **`AdapterTemporal` class itself**, whose constructor and methods are then fully synchronous, satisfying MUI's contract.
3. **Temporal polyfill: `temporal-polyfill`, installed onto `globalThis.Temporal`.** Once resolved (native or polyfilled), `Temporal` must be a real ambient global — a developer reaching for Temporal reaches for MDN/TC39 docs and expects `Temporal.PlainDate.from(...)` etc. to just work, with no bespoke accessor from this package. So when native support is absent, `ensureTemporal()` dynamically imports the polyfill's self-installing global entry point (`temporal-polyfill/global`), which assigns `Temporal` onto `globalThis` itself; when native support exists, nothing needs installing — it's already global. Either way, by the time `createTemporalAdapter()` resolves, `globalThis.Temporal` is guaranteed to exist and consumer code (inside and outside the adapter) uses it directly, exactly as documented upstream. `temporal-polyfill` is a real `dependencies` entry (not peer) since our code imports it dynamically, not the consumer.
4. **Week-info fallback: our own small hand-rolled `locale → firstDay` static table**, sourced from the same CLDR week-data that backs `Intl.Locale#getWeekInfo` natively, kept as its own module so it's only pulled in (code-split) when native `getWeekInfo` is missing.
5. **Default locale = the browser's (or runtime's) default locale, not a hardcoded string.** When `AdapterTemporal` is constructed without an explicit `locale` (i.e. `LocalizationProvider`'s `adapterLocale` prop is unset, so MUI calls `new AdapterTemporal({ locale: undefined, ... })`), it falls back to `Intl.DateTimeFormat().resolvedOptions().locale` — **not** `navigator.language`. That specific API is preferred because: (a) it's the exact locale identifier ICU will actually use for the adapter's own internal `Intl.DateTimeFormat`/`Intl.Locale#getWeekInfo` calls, so the "default locale" and "locale actually driving formatting" can never drift apart; (b) it's pure ECMA-402, no DOM dependency, so it works identically in the browser and in Node/SSR with no `typeof window` branching — `navigator.language` doesn't exist server-side. This resolution happens once, in the constructor, and is exposed via `getCurrentLocaleCode()` like every other adapter.
6. **Package name `@cxing/mui-temporal-adapter`; per-module default exports, deep-subpath-first.** Every public module (`createTemporalAdapter`, `AdapterTemporal`, `TemporalLocalizationProvider`) has its own build entry and its own `export default`, importable directly by subpath — `import createTemporalAdapter from '@cxing/mui-temporal-adapter/createTemporalAdapter'` — mirroring `@mui/material`'s per-component convention (not `@mui/x-date-pickers`'s named-export convention, which was the other option considered). The root barrel (`@cxing/mui-temporal-adapter`) re-exports each module's default as a named export — `export { default as createTemporalAdapter } from './createTemporalAdapter'` — so `import { createTemporalAdapter } from '@cxing/mui-temporal-adapter'` also works; subpath imports are the documented/preferred form (smaller import footprint, matches the requested pattern), the root barrel is a supported convenience. This requires a **multi-entry** Vite library build (one output file + declaration per public module) rather than a single-entry setup. `package.json`'s `exports` map uses a generic `"./*"` pattern (`{ "types": "./dist/*.d.ts", "import": "./dist/*.js" }`) rather than one hand-enumerated subpath per module, so adding a new public module later only means adding it to `vite.config.ts`'s `build.lib.entry` map — no further `package.json` edit needed (see decision log).

## Directory layout

```
TemporalProvider/
├── package.json / tsconfig.json / vite.config.ts / vitest.config.ts
├── eslint.config.js / .prettierrc.json / .prettierignore / .gitignore
├── commitlint.config.js / .lintstagedrc.json / .releaserc.json
├── .husky/{pre-commit, commit-msg}
├── .github/workflows/{ci-checks.yml, validate.yml, release.yml, storybook-deploy.yml}
├── .storybook/{main.ts, preview.tsx, vitest.setup.ts}
├── memory/{PLAN.md, DECISIONS.md, PROGRESS.md}
├── src/
│   ├── index.ts                      # root barrel: `export { default as X } from './X'` for each public module
│   ├── createTemporalAdapter.ts      # `export default` async factory + named option/type exports — own build entry
│   ├── AdapterTemporal/
│   │   ├── AdapterTemporal.ts        # `export default class AdapterTemporal` implements MuiPickersAdapter<string> — own build entry
│   │   ├── AdapterTemporal.types.ts
│   │   └── defaults.ts               # formats, escapedCharacters, formatTokenMap
│   ├── TemporalLocalizationProvider/
│   │   └── TemporalLocalizationProvider.tsx  # `export default` optional convenience wrapper: use() + <Suspense>, cached module-level adapter promise — own build entry
│   ├── temporal-runtime/
│   │   ├── ensureTemporal.ts         # feature-detect + lazy import('temporal-polyfill/global')
│   │   └── getTemporal.ts            # module-singleton accessor
│   ├── week-info/
│   │   ├── ensureWeekInfo.ts         # feature-detect Intl.Locale#getWeekInfo + lazy fallback import
│   │   ├── firstDayOfWeekTable.ts    # hand-rolled CLDR-sourced static data (own chunk)
│   │   └── getFirstDayOfWeek.ts
│   ├── format/{tokenizeFormat,formatByToken,parseByToken}.ts
│   └── utils/{timezone,invalid}.ts
├── test/
│   ├── setup.ts                       # registers @testing-library/jest-dom/vitest matchers
│   ├── adapter/*.test.ts             # getters-setters, arithmetic, comparisons, formatting, week, timezone
│   ├── components/*.test.tsx         # Vitest + React Testing Library: real picker + AdapterTemporal integration
│   └── temporal-runtime/, week-info/ # native-path + lazy-load-path tests for both feature detections
└── stories/
    ├── docs/
    │   ├── Introduction.mdx
    │   ├── GettingStarted.mdx
    │   ├── UsingThePickers.mdx
    │   ├── LocalesAndFirstDayOfWeek.mdx
    │   ├── TimeZones.mdx
    │   ├── HowTheFallbacksWork.mdx
    │   ├── Troubleshooting.mdx
    │   └── Glossary.mdx                      # beginner-friendly consumer guide
    ├── DatePicker.stories.tsx                # tags: ['autodocs'] + per-story description blurbs
    ├── TimePicker.stories.tsx
    ├── DateTimePicker.stories.tsx
    ├── LazyPolyfillEnvironment.stories.tsx   # forces both fallback paths, proves they work end-to-end
    └── LocaleWeekStart.stories.tsx           # locale switcher demonstrating first-day-of-week
```

Range pickers (`DateRangePicker`/`DateRangeCalendar`) live only in the commercial `@mui/x-date-pickers-pro` package — **excluded** from this deliverable to keep the library MIT-clean and freely testable; can be added later as its own gated phase if wanted.

## `AdapterTemporal` implementation notes (the core work)

Implements the full `MuiPickersAdapter<TDate>` surface (metadata, date builder, formatting, comparisons, boundaries, arithmetic, getters/setters, week helpers) — mirror `AdapterLuxon`'s method list/conventions as the closest reference (also ISO-first, 1–7 Monday-first `dayOfWeek`).

- Constructor: `this.locale = options?.locale ?? Intl.DateTimeFormat().resolvedOptions().locale;` — see decision 5. Every locale-sensitive method (`format`/`formatByString`'s `Intl.DateTimeFormat` calls, `startOfWeek`'s `getFirstDayOfWeek(this.locale)` lookup, `is12HourCycleInCurrentLocale`) reads from `this.locale`, never re-deriving a default independently.
- Always construct/coerce dates with `calendar: 'iso8601'` explicitly.
- Arithmetic/setters (`addDays`, `setMonth`, …) → `.add({...})` / `.with({...})`, always with `{ overflow: 'constrain' }` to match how every other adapter handles month-length edge cases (Jan 31 + 1 month → Feb 28/29, not a throw).
- `getWeekNumber` → `.weekOfYear` on the `iso8601` calendar (near-zero-cost).
- `startOfWeek`/`endOfWeek`/`getWeekArray` are **adapter-owned logic** — Temporal has no locale-aware week concept at all (only ISO/Monday-start), so these pull `firstDay` from `week-info/getFirstDayOfWeek.ts` (native `Intl.Locale#getWeekInfo` or the fallback table) and compute `startOfWeek` via `(dayOfWeek - firstDay + 7) % 7` days subtracted.
- `format`/`formatByString`/`parse`/`expandFormat`: Temporal has **no format-string engine** (unlike dayjs/luxon/moment) — this is the biggest net-new surface. Adopt Luxon-style tokens (`yyyy`, `MM`, `dd`, `EEEE`, `HH`, `mm`, `ss`, `a`); tokenize/format directly off `ZonedDateTime` fields, delegating locale-sensitive names (month/weekday names, AM/PM) to `Intl.DateTimeFormat`. `parse` builds a regex from the token list, assembles a field bag, constructs via `Temporal.PlainDateTime.from({...}, { overflow: 'reject' })`, returns `null` on failure.
- `toJsDate` → `zdt.toInstant().epochMilliseconds` → `new Date(ms)` (intentionally lossy escape hatch, matches other adapters).
- `getInvalidDate()`/`isValid`: Temporal has no first-class "invalid" value (unlike Luxon) — wrap construction in try/catch for `isValid`, and settle on a fixed out-of-range-but-constructible sentinel for `getInvalidDate()`; small design spike during implementation (log resolution in DECISIONS.md).

## Feature-detection/lazy-load modules

```ts
// src/temporal-runtime/ensureTemporal.ts
export async function ensureTemporal(opts?: { force?: boolean }) {
  if (!opts?.force && typeof globalThis.Temporal !== 'undefined') return; // already global (native)
  await import('temporal-polyfill/global'); // code-split chunk; self-installs onto globalThis.Temporal
}

// internal-only accessor used by AdapterTemporal's own methods — not part of the public API,
// since consumers are expected to reference the ambient `Temporal` global directly, not a
// bespoke import from this package.
export function getTemporal(): typeof Temporal {
  if (typeof globalThis.Temporal === 'undefined') {
    throw new Error(
      '[AdapterTemporal] await createTemporalAdapter() before rendering LocalizationProvider',
    );
  }
  return globalThis.Temporal;
}
```

```ts
// src/week-info/ensureWeekInfo.ts
let fallbackTable: FirstDayTable | undefined;
export async function ensureWeekInfo(opts?: { force?: boolean }) {
  if (!opts?.force && typeof Intl.Locale.prototype.getWeekInfo === 'function') return;
  if (fallbackTable) return;
  ({ firstDayOfWeekTable: fallbackTable } = await import('./firstDayOfWeekTable')); // code-split chunk
}
export function getFirstDayOfWeek(localeCode: string): number {
  if (typeof Intl.Locale.prototype.getWeekInfo === 'function' && !fallbackTable) {
    return new Intl.Locale(localeCode).getWeekInfo().firstDay;
  }
  return fallbackTable?.[localeCode] ?? fallbackTable?.[localeCode.split('-')[0]] ?? 1;
}
```

`createTemporalAdapter()` awaits both `ensureTemporal()` and `ensureWeekInfo()` before resolving, so `AdapterTemporal`'s methods are fully synchronous and race-free once constructed. Both expose `force*` options (used by tests and by the `LazyPolyfillEnvironment` story) to deterministically exercise the fallback branches even in environments that do have native support.

## Public API

```ts
// src/createTemporalAdapter.ts — own build entry / subpath: '@cxing/mui-temporal-adapter/createTemporalAdapter'
export interface TemporalAdapterOptions {
  forcePolyfill?: boolean; // force the temporal-polyfill path — for tests/Storybook
  forceWeekInfoFallback?: boolean; // force the static-table path — for tests/Storybook
  /** Default locale for the resolved AdapterTemporal class when constructed with no explicit
   *  `locale`/`adapterLocale`. Optional — omit to let AdapterTemporal fall back to
   *  `Intl.DateTimeFormat().resolvedOptions().locale` (the browser/runtime's default) itself. */
  locale?: string;
}
export type TemporalAdapterConstructor = new (options?: AdapterTemporalOptions) => AdapterTemporal;
export default async function createTemporalAdapter(
  options?: TemporalAdapterOptions,
): Promise<TemporalAdapterConstructor>;
```

```ts
// src/index.ts — root barrel, subpath: '@cxing/mui-temporal-adapter'
export { default as createTemporalAdapter } from './createTemporalAdapter';
export type { TemporalAdapterOptions, TemporalAdapterConstructor } from './createTemporalAdapter';
export { default as AdapterTemporal } from './AdapterTemporal/AdapterTemporal';
export type { AdapterTemporalOptions } from './AdapterTemporal/AdapterTemporal.types';
export { default as TemporalLocalizationProvider } from './TemporalLocalizationProvider/TemporalLocalizationProvider';
export type { TemporalLocalizationProviderProps } from './TemporalLocalizationProvider/TemporalLocalizationProvider';
```

No bespoke `getTemporal()`/similar public accessor — once `createTemporalAdapter()` resolves, `Temporal` is guaranteed to exist as an ambient global, and consumer code is expected to reference `Temporal.*` directly, exactly as TC39/MDN document it.

`TemporalLocalizationProvider` (`export default`, own build entry, subpath `'@cxing/mui-temporal-adapter/TemporalLocalizationProvider'`) — a thin wrapper around `createTemporalAdapter()` + `LocalizationProvider`, built on React 19's `use()` hook + `<Suspense>`:

- A module-level `adapterPromise` singleton memoizes the `createTemporalAdapter()` call (required for `use()`'s stable-promise-reference contract); every mount anywhere in the app shares one resolution.
- Props: `locale?: string` (forwarded to `LocalizationProvider`'s `adapterLocale`), `forcePolyfill?: boolean` and `forceWeekInfoFallback?: boolean` (testing/Storybook only), plus the rest of `LocalizationProviderProps` (minus `dateAdapter`) passed through.
- No `fallback`/`onError` props — the caller supplies a `<Suspense fallback={...}>` boundary, and an Error Boundary if they want one; `use()` re-throws a rejected promise into the nearest Error Boundary automatically.

**TypeScript ambient typing for the global**: consumer TS projects get a global `Temporal` type either from TypeScript's own bundled ES2026 lib, or — as a fallback — this package should ship an ambient `.d.ts` (sourced from `temporal-polyfill`'s own bundled types) declaring the global. Resolved as part of the Milestone 0 typing spike (log resolution in DECISIONS.md).

## Consumer usage

**Bootstrap** — resolve the adapter once, before rendering pickers:

```tsx
// A — top-level await at the app entry (ESM-only package; simplest)
import createTemporalAdapter from '@cxing/mui-temporal-adapter/createTemporalAdapter';

const AdapterTemporal = await createTemporalAdapter(); // no `locale` passed — falls back to the runtime default

createRoot(document.getElementById('root')!).render(
  <LocalizationProvider dateAdapter={AdapterTemporal}>
    <App />
  </LocalizationProvider>,
);
```

```tsx
// B — TemporalLocalizationProvider convenience wrapper (use() + <Suspense>)
import TemporalLocalizationProvider from '@cxing/mui-temporal-adapter/TemporalLocalizationProvider';

<Suspense fallback={<Spinner />}>
  <TemporalLocalizationProvider>
    <App />
  </TemporalLocalizationProvider>
</Suspense>;
```

Root-barrel form also works for either pattern: `import { createTemporalAdapter, TemporalLocalizationProvider } from '@cxing/mui-temporal-adapter';`

**Standard picker components** — once wrapped, every MUI X component works with zero per-component adapter wiring, producing/consuming `Temporal.ZonedDateTime | null`: `DatePicker`, `DateField`, `DateCalendar`, `TimePicker`, `TimeField`, `DateTimePicker`, `DateTimeField`.

**Controlled values / min-max** — reference the ambient `Temporal` global directly (only after bootstrap has resolved):

```tsx
const [value, setValue] = useState(Temporal.Now.zonedDateTimeISO('America/New_York'));

<DatePicker
  value={value}
  onChange={setValue}
  minDate={Temporal.PlainDate.from('2026-01-01')}
  maxDate={Temporal.PlainDate.from('2026-12-31')}
/>;
```

**Locale switching**: `<LocalizationProvider dateAdapter={AdapterTemporal} adapterLocale="fr-FR">`.

**Timezone-aware picking**: `<DateTimePicker timezone="America/Los_Angeles" />` / `"UTC"` / `"system"` — no special-casing needed since `TDate` already carries a zone.

## Documentation

Three distinct artifacts, three distinct audiences/tones:

1. **JSDoc in code** — precise, technical, IDE-hover-friendly reference for every exported symbol. Enforced via `eslint-plugin-jsdoc` (`jsdoc/require-jsdoc`, `require-description`, `require-param-description`, `require-returns-description`, plus `require-example` scoped to the three public-API entry files). Storybook's autodocs reads these same comments to populate prop tables.
2. **Storybook** — every `.stories.tsx` sets `tags: ['autodocs']`; each story also carries a plain-language `parameters.docs.description.story` blurb in the same beginner tone as the MDX pages.
3. **MDX consumer guide** (`stories/docs/*.mdx`, 8 pages, genuinely beginner-friendly — every term defined on first use, no bare acronyms, complete copy/pasteable examples): `Introduction`, `GettingStarted`, `UsingThePickers`, `LocalesAndFirstDayOfWeek`, `TimeZones`, `HowTheFallbacksWork`, `Troubleshooting`, `Glossary`.

`README.md` stays closer to conventional npm-README tone (partly an evaluation audience), pointing to the MDX guide for the full walkthrough.

## Tooling configuration

**`package.json`** — name `@cxing/mui-temporal-adapter`, `"type": "module"`, `sideEffects: false`, ESM-only `exports` map using a generic `"./*"` pattern mapped to flat `dist/*.js`/`dist/*.d.ts` files (`import`+`types` only, no `require`/`main`), so it doesn't need editing each time a new public module is added, `publishConfig: { access: "public", provenance: true }`. `temporal-polyfill` as a real `dependency`; `react`, `react-dom`, `@mui/material`, `@mui/x-date-pickers` as `peerDependencies` (mirrored in `devDependencies`). Package manager: **pnpm** (`"packageManager"` field pinned via Corepack). Latest majors verified at scaffold time via `pnpm view <pkg> version` (research-time snapshot, Aug 2026: TypeScript 7.x, Vite 8.x, Vitest 4.x, ESLint 10.x + typescript-eslint 8.x, Prettier 3.9.x, Storybook 10.x, MUI X 9.x, MUI Material 9.x, React 19.x, `temporal-polyfill` 1.x, `vite-plugin-dts` 5.x, `@testing-library/*`, `eslint-plugin-jsdoc`).

No `require`/CJS `exports` condition anywhere — ESM-only, documented plainly in the README.

**`tsconfig.json`** — `target`/`lib: ESNext` (dev typechecking only), `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `strict: true`, `noEmit: true`.

**`vite.config.ts`** — multi-entry `build.lib` (`index`, `createTemporalAdapter`, `AdapterTemporal`, `TemporalLocalizationProvider`), `target: 'es2024'`, `formats: ['es']` only, peers externalized, `temporal-polyfill`/fallback table left un-externalized so their dynamic imports become genuine shared on-demand chunks. `vite-plugin-dts` needs a matching per-entry declaration output — small build-config spike (log resolution in DECISIONS.md).

**`vitest.config.ts`** — three `test.projects`: `unit` (node), `component` (jsdom, Vitest + React Testing Library), `storybook` (Playwright browser mode via `@storybook/addon-vitest`).

**`eslint.config.js`** — flat config: `@eslint/js` recommended + `typescript-eslint` recommendedTypeChecked + `eslint-plugin-react`/`react-hooks` + `eslint-plugin-storybook` + `eslint-plugin-jsdoc` + `eslint-config-prettier` last. **No `eslint-plugin-jsx-a11y`** — this package authors no DOM-rendering UI of its own.

**`.prettierrc.json`** — baseline: `semi: true, singleQuote: true, trailingComma: "all", printWidth: 100, tabWidth: 2, arrowParens: "always"`.

## Commit hygiene & CI/CD

**Versioning: semantic-release** — derives the bump from Conventional Commits (enforced by commitlint), handles changelog/tag/npm publish/GitHub release in one pipeline.

**Husky**: `.husky/commit-msg` → `commitlint --edit "$1"` (message format, via `commitlint.config.js` extending `@commitlint/config-conventional`). `.husky/pre-commit` → `lint-staged` (ESLint `--fix` + Prettier `--write` on staged files, via `.lintstagedrc.json`). `package.json` `"prepare": "husky"`.

**GitHub Actions — four workflows**:

- `ci-checks.yml` (reusable, `workflow_call`) — typecheck, lint, `test:coverage` (unit+component, coverage-gated), build.
- `validate.yml` (PR + manual) — calls `ci-checks.yml`; runs `test:storybook` separately (not coverage-gated); posts/updates a PR coverage comment via `davelosert/vitest-coverage-report-action` (PR events only).
- `release.yml` (push to `main` + manual) — calls `ci-checks.yml`, then `pnpm run release` (`semantic-release`) via npm Trusted Publisher/OIDC (no `NPM_TOKEN` secret); `@semantic-release/git` commits `CHANGELOG.md` + version bump back with `[skip ci]`. (semantic-release's npm plugin talks to the npm registry directly regardless of pnpm being the local package manager.)
- `storybook-deploy.yml` (`workflow_run` off a successful `release.yml` + manual) — builds Storybook, deploys to GitHub Pages via `actions/deploy-pages`.

Coverage: Vitest native `thresholds: { branches: 85, functions: 90 }`, scoped to `unit`+`component` projects only.

**One-time manual setup** (not codifiable in YAML): npm Trusted Publisher config on npmjs.com (first publish may need to happen manually before OIDC trust can attach); GitHub Pages source = "GitHub Actions"; branch protection on `main` requiring the `validate` check, disallowing direct pushes.

## Milestones

0. Create `./memory/{PLAN.md,DECISIONS.md,PROGRESS.md}` — first action. Then scaffold repo, install deps at verified latest, confirm `tsc --noEmit` sees the global `Temporal` type cleanly (spike — log resolution in DECISIONS.md).
1. Build `temporal-runtime/ensureTemporal.ts` + `week-info/ensureWeekInfo.ts` + fallback table in isolation with unit tests proving both branches of each.
2. `AdapterTemporal` core: date builder, getters/setters, arithmetic, comparisons, boundaries, week helpers. Stub `format`/`parse`/`expandFormat`. Full JSDoc written alongside.
3. Format/parse token engine; resolve `getInvalidDate()` sentinel design (log in DECISIONS.md).
4. Vite multi-entry library build; verify per-module `dist/` output + declarations, shared on-demand chunks, `es2024` target.
5. Full Vitest suite against the method inventory plus native/polyfill and native/fallback path tests, plus `component` project tests.
6. ESLint + Prettier clean across `src/`, `test/`, `stories/`.
7. Storybook: 5 story files (autodocs + description blurbs) + 8 MDX guide pages; wire the Vitest `storybook` project.
8. `README.md`; `pnpm pack` + local install smoke test into a throwaway consumer app.
9. Commit hygiene + CI/CD: Husky/commitlint/lint-staged locally; author the 4 workflows; complete the 3 one-time manual setup steps; open a throwaway PR to prove the full loop.
10. Documentation consistency pass: re-read MDX pages for jargon/tone drift, spot-check JSDoc renders sensibly in autodocs, confirm `eslint-plugin-jsdoc` clean.

**Review cadence**: work pauses at the end of each Milestone for review of `PROGRESS.md` + a short summary before starting the next one.

## Verification

Typecheck clean → unit+component tests green (including forced-fallback runs) → Storybook/Playwright tests green → build produces correct per-module ESM output with shared dynamic chunks → lint/format clean → manual `pnpm pack` install smoke test (subpath + root-barrel imports both work) → documentation checks (lint-jsdoc clean, autodocs populated, MDX pages walkable by a Temporal-unfamiliar reader) → commit-hook checks (bad/good messages, staged-file autofix) → full CI/CD loop proven end-to-end on a throwaway PR (coverage comment, merge → release → npm publish with no stored token → Storybook deploy to Pages, plus each workflow's manual `workflow_dispatch` trigger working independently).
