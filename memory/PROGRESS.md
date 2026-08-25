# Progress

Checklist mirroring `PLAN.md`'s Milestones, one checkbox per concrete step. Checked off only once a
step is actually completed and verified — this file is always meant to be an accurate answer to
"where are we." Work pauses at the end of each Milestone for review before the next one starts.

## Milestone 0 — Scaffold
- [x] Create `./memory/{PLAN.md,DECISIONS.md,PROGRESS.md}`
- [x] `git init`, initial `.gitignore`, remote `origin` → github.com/cutterbl/mui-temporal-adapter, initial commit pushed to `main`, work continuing on branch `feat/initial-implementation`
- [x] `pnpm init` — base `package.json` (name `@cxing/mui-temporal-adapter`, type: module, `packageManager` pinned to pnpm@11.9.0, ESM-only `exports` map scaffolded, scripts stubbed)
- [x] Install latest-major dependencies via pnpm — all resolved to the exact versions researched in planning (React 19.2.8, MUI X 9.12.0, MUI Material 9.3.1, TS 7.0.2, Vite 8.2.2, Vitest 4.1.11, ESLint 10.9.1, Storybook 10.5.10, temporal-polyfill 1.0.4, etc.); `peerDependencies` block added for react/react-dom/@mui/material/@mui/x-date-pickers; esbuild's postinstall build script approved via `pnpm approve-builds`; peer-range lag on eslint-plugin-react/typescript-eslint noted in `DECISIONS.md` (not blocking, re-check at Milestone 6)
- [x] `tsconfig.json`
- [x] Resolve global `Temporal` typing spike — **resolved**: TS 7.0.2's bundled `ESNext` lib already ships ambient `Temporal` global types natively, no ambient `.d.ts` needed from this package; logged in `DECISIONS.md`

## Milestone 1 — Feature-detection / lazy-load modules
- [x] `src/temporal-runtime/ensureTemporal.ts` + `getTemporal.ts`
- [x] Unit tests: native-Temporal-present path (`test/temporal-runtime/ensureTemporal.native.test.ts`)
- [x] Unit tests: native-Temporal-absent → lazy polyfill import path (`ensureTemporal.polyfill.test.ts`) — found & fixed a real bug: `force` must delete the global first, since temporal-polyfill's installer treats any existing `globalThis.Temporal` as native (logged in `DECISIONS.md`)
- [x] `src/week-info/firstDayOfWeekTable.ts` (CLDR-sourced static data, region-keyed, exceptions-only)
- [x] `src/week-info/ensureWeekInfo.ts` + `getFirstDayOfWeek.ts` — resolved via `Intl.Locale().maximize().region`, not naive language-tag splitting (logged in `DECISIONS.md`)
- [x] Unit tests: native `getWeekInfo` present path (`test/week-info/ensureWeekInfo.native.test.ts`)
- [x] Unit tests: native `getWeekInfo` absent → lazy fallback-table import path, plus forced-fallback-with-native-present path (`ensureWeekInfo.fallback.test.ts`)
- [x] `tsc --noEmit` and `vitest run --project unit` both clean (4 files, 8 tests passing)

## Milestone 2 — `AdapterTemporal` core
- [x] `AdapterTemporal.types.ts`, `defaults.ts` (formats, escapedCharacters, formatTokenMap)
- [x] Constructor (locale default resolution, `iso8601` calendar)
- [x] Date builder / timezone methods (`date`, `getTimezone`, `setTimezone`, `toJsDate`) — plus
      `src/utils/{timezone,invalid}.ts` helpers (per the plan's directory layout)
- [x] Getters/setters (year/month/date/hours/minutes/seconds/milliseconds)
- [x] Arithmetic (`addYears`…`addSeconds`, `{ overflow: 'constrain' }`)
- [x] Comparisons (`isEqual`, `isSameYear/Month/Day/Hour`, `isAfter*`, `isBefore*`, `isWithinRange`)
- [x] Boundaries (`startOf*`, `endOf*`)
- [x] Week helpers (`getDaysInMonth`, `getWeekArray`, `getWeekNumber`, `getDayOfWeek`, `getYearRange`)
      — `getDayOfWeek` confirmed locale-relative (not raw ISO) by cross-checking `AdapterLuxon`; see
      `DECISIONS.md`
- [x] `getInvalidDate()`/`isValid()` — sentinel design resolved now rather than deferred to
      Milestone 3, since it had no dependency on the format/parse engine; see `DECISIONS.md`
- [x] `format`/`formatByString`/`parse`/`expandFormat` stubbed (throw not-implemented);
      `formatNumber`/`is12HourCycleInCurrentLocale` implemented fully now (no format-engine
      dependency)
- [x] JSDoc written alongside every method above (not deferred)
- [x] `src/createTemporalAdapter.ts` (async factory) + `src/index.ts` (root barrel) — not originally
      itemized in this checklist; added now since `AdapterTemporal` alone isn't part of the intended
      public API and couldn't be smoke-tested end-to-end without the factory; see `DECISIONS.md`
- [x] Real bug found & fixed via an end-to-end smoke test (not committed): `ensureTemporal`'s
      `force` path (Milestone 1) still silently failed on a *second* forced call in the same
      process — superseded with a more robust fix (installs from `temporal-polyfill/implementation`
      directly rather than depending on the self-installing `/global` entry's one-time side effect);
      see `DECISIONS.md`. Milestone 1's two `ensureTemporal` test files updated accordingly (still
      passing); `tsc --noEmit` and `vitest run --project unit` both clean (4 files, 8 tests)

## Milestone 3 — Format/parse token engine
- [ ] `src/format/tokenizeFormat.ts`
- [ ] `src/format/formatByToken.ts` (+ `Intl.DateTimeFormat` delegation for locale names)
- [ ] `src/format/parseByToken.ts`
- [ ] Wire into `AdapterTemporal.format`/`formatByString`/`parse`/`expandFormat`
- [ ] Resolve `getInvalidDate()` sentinel design — log resolution in `DECISIONS.md`
- [ ] JSDoc continues alongside

## Milestone 4 — Vite multi-entry library build
- [ ] Author `src/TemporalLocalizationProvider/TemporalLocalizationProvider.tsx` (`use()` +
      `<Suspense>` wrapper, per `PLAN.md`) — not originally itemized anywhere in Milestones 0–4; it
      needs to exist before this milestone's build-entry map can reference it, even though its own
      component testing waits for the `component` Vitest project in Milestone 5; see `DECISIONS.md`
- [ ] `vite.config.ts` multi-entry `build.lib`
- [ ] `vite-plugin-dts` per-entry declaration output configured — log resolution in `DECISIONS.md`
- [ ] Verify `dist/index.js`, `dist/createTemporalAdapter.js`, `dist/AdapterTemporal.js`, `dist/TemporalLocalizationProvider.js` + matching `.d.ts`
- [ ] Verify `temporal-polyfill`/fallback-table land as shared separate on-demand chunks (not duplicated per entry)
- [ ] Verify `es2024` target in emitted output

## Milestone 5 — Full Vitest suite
- [ ] `test/adapter/getters-setters.test.ts`
- [ ] `test/adapter/arithmetic.test.ts`
- [ ] `test/adapter/comparisons.test.ts`
- [ ] `test/adapter/formatting.test.ts`
- [ ] `test/adapter/week.test.ts`
- [ ] `test/adapter/timezone.test.ts`
- [ ] `test/components/*.test.tsx` (Testing Library, real pickers + `AdapterTemporal`, incl. calendar-grid ordering under `forceWeekInfoFallback`)
- [ ] Coverage thresholds (85% branch / 90% function) met on `unit`+`component` projects

## Milestone 6 — Lint/format
- [ ] `eslint.config.js` authored (no jsx-a11y)
- [ ] `.prettierrc.json` / `.prettierignore` authored
- [ ] `pnpm lint` clean across `src/`, `test/`, `stories/`
- [ ] `pnpm format -- --check` clean

## Milestone 7 — Storybook
- [ ] `.storybook/main.ts` / `preview.tsx` / `vitest.setup.ts`
- [ ] `DatePicker.stories.tsx`
- [ ] `TimePicker.stories.tsx`
- [ ] `DateTimePicker.stories.tsx`
- [ ] `LazyPolyfillEnvironment.stories.tsx`
- [ ] `LocaleWeekStart.stories.tsx`
- [ ] `stories/docs/Introduction.mdx`
- [ ] `stories/docs/GettingStarted.mdx`
- [ ] `stories/docs/UsingThePickers.mdx`
- [ ] `stories/docs/LocalesAndFirstDayOfWeek.mdx`
- [ ] `stories/docs/TimeZones.mdx`
- [ ] `stories/docs/HowTheFallbacksWork.mdx`
- [ ] `stories/docs/Troubleshooting.mdx`
- [ ] `stories/docs/Glossary.mdx`
- [ ] Vitest `storybook` project wired; `pnpm test:storybook` runs stories as real assertions

## Milestone 8 — README + packaging smoke test
- [ ] `README.md` (usage, async-factory rationale, browser support matrix, ESM-only note)
- [ ] `pnpm pack` + install into a scratch Vite+React app
- [ ] Confirm subpath default-export imports work
- [ ] Confirm root-barrel named-export imports work

## Milestone 9 — Commit hygiene + CI/CD
- [ ] `commitlint.config.js`
- [ ] `.lintstagedrc.json`
- [ ] `.husky/commit-msg`, `.husky/pre-commit`, `package.json` `prepare` script
- [ ] `.releaserc.json` (semantic-release plugin pipeline)
- [ ] `.github/workflows/ci-checks.yml`
- [ ] `.github/workflows/validate.yml`
- [ ] `.github/workflows/release.yml`
- [ ] `.github/workflows/storybook-deploy.yml`
- [ ] One-time setup: npm Trusted Publisher configured — log any sequencing caveat in `DECISIONS.md`
- [ ] One-time setup: GitHub Pages source = "GitHub Actions"
- [ ] One-time setup: branch protection on `main` requiring the `validate` check
- [ ] Throwaway PR opened to confirm the full loop end-to-end (see Verification in `PLAN.md`)

## Milestone 10 — Documentation consistency pass
- [ ] Re-read all 8 MDX pages back-to-back for undefined jargon/acronyms and tone drift
- [ ] Spot-check JSDoc renders sensibly in editor tooltips
- [ ] Spot-check JSDoc renders sensibly in Storybook autodocs prop tables
- [ ] `eslint-plugin-jsdoc` clean across `src/**`

## Notes / blockers

_(nothing yet)_
