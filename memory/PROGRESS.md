# Progress

Checklist mirroring `PLAN.md`'s Milestones, one checkbox per concrete step. Checked off only once a
step is actually completed and verified — this file is always meant to be an accurate answer to
"where are we." Work pauses at the end of each Milestone for review before the next one starts.

## Milestone 0 — Scaffold
- [x] Create `./memory/{PLAN.md,DECISIONS.md,PROGRESS.md}`
- [ ] `git init`, initial `.gitignore`
- [ ] `pnpm init` — base `package.json` (name, type: module, `packageManager` pinned, private until ready)
- [ ] Install latest-major dependencies via pnpm (verify each via `pnpm view <pkg> version`)
- [ ] `tsconfig.json`
- [ ] Resolve global `Temporal` typing spike (tsc sees the global type cleanly) — log resolution in `DECISIONS.md`

## Milestone 1 — Feature-detection / lazy-load modules
- [ ] `src/temporal-runtime/ensureTemporal.ts` + `getTemporal.ts`
- [ ] Unit tests: native-Temporal-present path
- [ ] Unit tests: native-Temporal-absent → lazy polyfill import path
- [ ] `src/week-info/firstDayOfWeekTable.ts` (CLDR-sourced static data)
- [ ] `src/week-info/ensureWeekInfo.ts` + `getFirstDayOfWeek.ts`
- [ ] Unit tests: native `getWeekInfo` present path
- [ ] Unit tests: native `getWeekInfo` absent → lazy fallback-table import path

## Milestone 2 — `AdapterTemporal` core
- [ ] `AdapterTemporal.types.ts`, `defaults.ts` (formats, escapedCharacters, formatTokenMap)
- [ ] Constructor (locale default resolution, `iso8601` calendar)
- [ ] Date builder / timezone methods (`date`, `getTimezone`, `setTimezone`, `toJsDate`)
- [ ] Getters/setters (year/month/date/hours/minutes/seconds/milliseconds)
- [ ] Arithmetic (`addYears`…`addSeconds`, `{ overflow: 'constrain' }`)
- [ ] Comparisons (`isEqual`, `isSameYear/Month/Day/Hour`, `isAfter*`, `isBefore*`, `isWithinRange`)
- [ ] Boundaries (`startOf*`, `endOf*`)
- [ ] Week helpers (`getDaysInMonth`, `getWeekArray`, `getWeekNumber`, `getDayOfWeek`, `getYearRange`)
- [ ] `format`/`parse`/`expandFormat` stubbed (throw not-implemented)
- [ ] JSDoc written alongside every method above (not deferred)

## Milestone 3 — Format/parse token engine
- [ ] `src/format/tokenizeFormat.ts`
- [ ] `src/format/formatByToken.ts` (+ `Intl.DateTimeFormat` delegation for locale names)
- [ ] `src/format/parseByToken.ts`
- [ ] Wire into `AdapterTemporal.format`/`formatByString`/`parse`/`expandFormat`
- [ ] Resolve `getInvalidDate()` sentinel design — log resolution in `DECISIONS.md`
- [ ] JSDoc continues alongside

## Milestone 4 — Vite multi-entry library build
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
