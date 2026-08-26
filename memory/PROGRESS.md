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
      `force` path (Milestone 1) still silently failed on a _second_ forced call in the same
      process — superseded with a more robust fix (installs from `temporal-polyfill/implementation`
      directly rather than depending on the self-installing `/global` entry's one-time side effect);
      see `DECISIONS.md`. Milestone 1's two `ensureTemporal` test files updated accordingly (still
      passing); `tsc --noEmit` and `vitest run --project unit` both clean (4 files, 8 tests)

## Milestone 3 — Format/parse token engine

- [x] `src/format/tokenizeFormat.ts` — literal/token lexer (quoted-literal handling,
      `''` escape), locale-independent
- [x] `src/format/fieldTokens.ts` — shared `SUPPORTED_FIELD_TOKENS` set, split out from
      `formatByToken.ts` to avoid a circular import once macro-token formatting needed
      `expandFormat.ts`; not originally itemized, see `DECISIONS.md`
- [x] `src/format/formatByToken.ts` (+ `Intl`/`toLocaleString()` delegation for locale
      names — month/weekday names, meridiem)
- [x] `src/format/expandFormat.ts` — `D`/`DD`/`T` locale-macro expansion + stray-word
      auto-quoting; not originally itemized as its own file, see `DECISIONS.md`
- [x] `src/format/parseByToken.ts`
- [x] Wire into `AdapterTemporal.format`/`formatByString`/`parse`/`expandFormat`
- [x] `getInvalidDate()` sentinel design — already resolved in Milestone 2, not
      actually pending here after all
- [x] JSDoc continues alongside
- [x] Two real bugs found & fixed via an end-to-end smoke test (not committed): macro
      tokens' digit padding could disagree between `format()` and `expandFormat()`
      output; macro tokens rendered in the locale's native numbering system (e.g.
      Arabic-Indic for `ar-SA`), breaking round-trip parsing. Both fixed, verified
      across `en-US`/`fr-FR`/`ja-JP`/`ar-SA`; see `DECISIONS.md`. `tsc --noEmit` and
      `vitest run --project unit` both clean (4 files, 8 tests)

## Milestone 4 — Vite multi-entry library build

- [x] Author `src/TemporalLocalizationProvider/TemporalLocalizationProvider.tsx` (`use()` +
      `<Suspense>` wrapper, per `PLAN.md`) — not originally itemized anywhere in Milestones 0–4; it
      needs to exist before this milestone's build-entry map can reference it, even though its own
      component testing waits for the `component` Vitest project in Milestone 5; see `DECISIONS.md`.
      Module-level `adapterPromises` cache keyed by `Boolean(forcePolyfill):Boolean(forceWeekInfoFallback)`
      (bounded to 4 entries) so `use()`'s stable-promise-reference requirement holds across renders
      while still supporting Storybook/tests mounting different force-flag combinations
- [x] `vite.config.ts` multi-entry `build.lib` (`index`, `createTemporalAdapter`, `AdapterTemporal`,
      `TemporalLocalizationProvider`), `es2024` target, `react`/`react-dom`/`@mui/*`/`@emotion/*`
      externalized, `temporal-polyfill`/fallback table left un-externalized for on-demand chunking
- [x] `vite-plugin-dts` per-entry declaration output configured — resolved via flat root-level
      re-export wrapper files (`src/AdapterTemporal.ts`, `src/TemporalLocalizationProvider.tsx`)
      rather than `bundleTypes`/API Extractor (hit a real API Extractor bug); full writeup in
      `DECISIONS.md`. New devDependency: `@typescript/typescript6` (required by `unplugin-dts` for
      the TS Compiler API, which TypeScript 7+ no longer bundles) — unrelated to the bundling
      decision, still needed either way
- [x] Verified `dist/index.js`, `dist/createTemporalAdapter.js`, `dist/AdapterTemporal.js`,
      `dist/TemporalLocalizationProvider.js` + matching flat `.d.ts` for each; also verified by
      actually importing straight from a real `dist/` build (both subpath and root-barrel forms
      resolve to the same function/class; a constructed `AdapterTemporal` instance works —
      `date()`, `formatByString()`, `getCurrentLocaleCode()` all correct) — not just that the build
      didn't error
- [x] Verified `temporal-polyfill`/fallback-table land as shared separate on-demand chunks (not
      duplicated per entry) — found & fixed a real bug in the process:
      `firstDayOfWeekTable.ts` wasn't actually code-split (a static import in
      `getFirstDayOfWeek.ts`, just for one constant, defeated it); see `DECISIONS.md`
- [x] Verified `es2024` target in emitted output (no TS downlevel helpers present in any built chunk)

## Milestone 5 — Full Vitest suite

- [x] `test/adapter/getters-setters.test.ts` — getters, per-field setters, `setMonth`/`setYear`/
      `setDate` overflow-constrain edge cases (Jan 31 → Feb 29/28, Feb 29 → non-leap year)
- [x] `test/adapter/arithmetic.test.ts` — `addYears`…`addSeconds`, negative amounts,
      `addMonths`/`addYears` constrain behavior
- [x] `test/adapter/comparisons.test.ts` — `isEqual`, `isSame*`, `isAfter*`/`isBefore*`,
      `isWithinRange`; a dedicated test proves `isSameDay` projects `comparing` into the
      _reference_ date's own timezone (Tokyo, fixed +09:00, no DST) rather than its own
- [x] `test/adapter/formatting.test.ts` — every `format`/`formatByString`/`parse`/`expandFormat`
      token (digit, name, macro), `formats` overrides, literal-quoting incl. an unterminated
      quote and a standalone `''`, malformed-input null cases, 12-hour AM/PM boundary math,
      `yy` century resolution, unsupported-token throw
- [x] `test/adapter/week.test.ts` — `startOfWeek`/`endOfWeek`/boundaries, `getDaysInMonth`,
      `getWeekNumber`, `getDayOfWeek`, `getWeekArray` (full-grid shape + locale-correct first
      column, en-US Sunday-first vs. fr-FR Monday-first), `getYearRange`
- [x] `test/adapter/timezone.test.ts` — `date()`'s instant/wall-clock/invalid branches,
      `getTimezone`/`setTimezone`, `toJsDate`, `getInvalidDate`/`isValid`, `getCurrentLocaleCode`
- [x] `test/createTemporalAdapter.test.ts` + `test/temporal-runtime/getTemporal.test.ts` — not
      originally itemized; added to close real coverage gaps (factory-level default-locale
      layering, `getTemporal()`'s not-yet-available throw); see `DECISIONS.md`
- [x] `test/components/*.test.tsx` (Testing Library, real `LocalizationProvider` + MUI X pickers + `AdapterTemporal`, jsdom): `DateCalendar` (locale-aware week-start ordering, both native
      and `forceWeekInfoFallback`), `DatePicker`/`TimePicker`/`DateTimePicker` (field rendering,
      keyboard interaction + `onChange`, timezone-awareness), `TemporalLocalizationProvider`
      (`use()`/`<Suspense>` resolution, `forcePolyfill`, `forceWeekInfoFallback`) — `vitest.config.ts`
      gained the `component` project (jsdom + `@vitejs/plugin-react`) and `test/setup.ts`
      (`@testing-library/jest-dom/vitest`) to support this, per `PLAN.md`
- [x] Real bug found & fixed via this suite: `expandFormat()` could corrupt literal text at a
      quoted-run boundary; see `DECISIONS.md`
- [x] Testing-environment gotcha found & documented (no source change): React 19 `use()` +
      `<Suspense>` needs the initial `render()` wrapped in `await act(async () => ...)` in this
      RTL/jsdom setup, or the suspended tree never re-renders; see `DECISIONS.md`
- [x] Coverage thresholds (85% branch / 90% function) met on `unit`+`component` projects —
      88.19% branches / 100% functions / 96.74% statements / 99.11% lines (`@vitest/coverage-v8`
      added as a devDependency); see `DECISIONS.md` for the one small class of provably-
      unreachable branches left uncovered
- [x] `tsc --noEmit`, `pnpm test` (`vitest run --project unit --project component`) both clean:
      18 test files, 93 tests passing

## Milestone 6 — Lint/format

- [x] Real blocker hit and resolved (user-confirmed): `typescript-eslint@8.68.0` hard-throws
      against TypeScript 7.x (own peer range caps at `<6.1.0`, upstream issue still open, no
      fix available via pnpm `overrides`/`packageExtensions`/`patch` — all tried and failed to
      redirect the nested peer resolution). Project's `typescript` devDependency downgraded
      `^7.0.2` → `^6.0.3` (verified: identical ambient `Temporal` typing); the
      `@typescript/typescript6` fallback devDependency added in Milestone 4 for
      `unplugin-dts` is no longer needed and was removed. Full writeup in `DECISIONS.md`.
- [x] `eslint.config.js` authored (no jsx-a11y); explicitly sets
      `'@typescript-eslint/no-explicit-any': 'error'` (don't rely on preset defaults) — user
      directive, `any` must never be used, enforced not just conventional; see `DECISIONS.md`.
      Base: `@eslint/js` recommended + `typescript-eslint`'s `recommendedTypeChecked` (scoped
      to `**/*.{ts,tsx}` via the `files`+`extends` pattern, not spread unscoped — see
      `DECISIONS.md`); `eslint-plugin-react`/`react-hooks` for `.tsx`/`stories/**`;
      `eslint-plugin-storybook`'s `flat/recommended` for `stories/**`/`.storybook/**` (wired
      ahead of Milestone 7); `eslint-plugin-jsdoc` enforcing the Documentation standard from
      `PLAN.md` across `src/**`, with `jsdoc/require-example` scoped to the three public-API
      entry files; `eslint-config-prettier` last
- [x] Real bug found via `eslint-plugin-react`'s own `settings.react.version: 'detect'`
      crashing under ESLint 10 (`context.getFilename()` removed) — worked around by
      hardcoding the installed React version instead; see `DECISIONS.md`
- [x] `.prettierrc.json` / `.prettierignore` authored (plan's stated baseline)
- [x] `pnpm lint` clean across `src/`, `test/` (`stories/` doesn't exist yet — Milestone 7)
- [x] `pnpm format` run repo-wide (24 files reformatted — nothing had been Prettier-formatted
      before this milestone); `pnpm format:check` now clean
- [x] Small real fixes surfaced by lint actually running for the first time: a missing JSDoc
      description on `AdapterTemporal`'s constructor and on `MacroToken`; an unnecessary `as
MacroToken` type assertion in `formatByToken.ts` (TS 6 narrows it via the switch
      already); a verified `@typescript-eslint/no-unsafe-member-access` false positive on
      `Intl.Locale.prototype.getWeekInfo` (constructor `.prototype` access, TS 6.x
      `esnext.intl` lib quirk — cross-checked against a direct `tsc` probe), isolated into
      `src/week-info/hasNativeGetWeekInfo.ts` with one documented, justified disable
- [x] `tsc --noEmit`, `pnpm test` (93 tests), `pnpm build` all re-verified clean after the
      `typescript` downgrade and every lint/format fix

## Milestone 7 — Storybook

- [x] Real bug found & fixed: `tsconfig.json`'s bare `.storybook` include entry silently
      checked zero files (dot-prefixed directories aren't auto-expanded the way plain ones
      are) — changed to the explicit `.storybook/**/*` glob; see `DECISIONS.md`
- [x] `.storybook/main.ts` (framework `@storybook/react-vite`, `addon-docs` + `addon-vitest`,
      `stories` glob covering both `.stories.tsx` and `docs/**/*.mdx`) / `preview.tsx` (global
      decorator wrapping every story in `Suspense` + `TemporalLocalizationProvider`, reading
      per-story `parameters.temporal` for the force-flag stories) — **no** `vitest.setup.ts`
      in the end: `PLAN.md` called for one wiring `setProjectAnnotations`, but this installed
      version (Storybook 10.3+) applies `preview.tsx`'s annotations to Vitest-run stories
      automatically and says so directly if a manual call is present anyway; see
      `DECISIONS.md`
- [x] `DatePicker.stories.tsx` (Default, WithMinAndMaxDate)
- [x] `TimePicker.stories.tsx` (Default, TwentyFourHour)
- [x] `DateTimePicker.stories.tsx` (Default, InAFixedTimeZone)
- [x] User-directed follow-up (post-initial-commit): all 6 of the above stories rewritten as
      genuinely controlled components — live `useState(() => Temporal.Now.zonedDateTimeISO(...))`
      value, current value shown as text below each field, and `parameters.docs.source.code`
      pinning "Show code" to the matching idiomatic snippet (verified against the real rendered
      panel via Playwright, not just that the parameter was set). See `DECISIONS.md`.
- [x] `LazyPolyfillEnvironment.stories.tsx` (ForcedPolyfill, ForcedWeekInfoFallback,
      BothForced — each via `parameters.temporal`)
- [x] `LocaleWeekStart.stories.tsx` (SwitchLocale — a small local demo component with a real
      `locale` prop, driven live by Storybook's Controls panel, per `DECISIONS.md`)
- [x] `stories/docs/Introduction.mdx`
- [x] `stories/docs/GettingStarted.mdx`
- [x] `stories/docs/UsingThePickers.mdx`
- [x] `stories/docs/LocalesAndFirstDayOfWeek.mdx`
- [x] `stories/docs/TimeZones.mdx`
- [x] `stories/docs/HowTheFallbacksWork.mdx`
- [x] `stories/docs/Troubleshooting.mdx`
- [x] `stories/docs/Glossary.mdx`
      — all 8 cross-linked to each other via real generated Storybook doc-entry IDs (verified
      against `storybook-static/index.json` after a real build, not guessed)
- [x] Vitest `storybook` project wired (`@storybook/addon-vitest`'s `storybookTest` plugin +
      Playwright/Chromium browser mode, matching the addon's own bundled Vitest-4 template);
      new devDependencies `@vitest/browser-playwright` + a locally-installed matching Chromium
      binary; `pnpm test:storybook` runs every story as a real browser-rendered test — 5 story
      files, 10 stories, all green
- [x] `tsc --noEmit`, `pnpm lint`, `pnpm format:check`, `pnpm test:all` (23 files / 103 tests),
      `pnpm build`, and `pnpm build:storybook` all re-verified clean
- [x] Real bug found (user-reported, with a screenshot, after this milestone's initial commit)
      & fixed: the numbered Docs titles alone didn't actually sort the sidebar — Storybook's
      real default `storySort` method is discovery-order, not alphabetical. Added
      `parameters.options.storySort: { method: 'alphabetical' }` to `preview.tsx`; verified
      against the real rendered sidebar DOM via Playwright. See `DECISIONS.md`.

## Milestone 8 — README + packaging smoke test

- [x] `README.md` — install, ESM-only callout, both bootstrap options (convenience component /
      manual factory), async-factory rationale, browser support matrix, TypeScript note, API
      reference table, link out to the Storybook docs site for the full beginner guide
- [x] `LICENSE` (MIT) — not originally itemized, added alongside the README since
      `package.json` already declared `"license": "MIT"` with no license file backing it
- [x] Real, genuine packaging bug found & fixed: `vite.config.ts`'s `external` list used plain
      package-name strings, which don't match the _subpath_ imports
      (`@mui/x-date-pickers/LocalizationProvider`) `TemporalLocalizationProvider.tsx` actually
      uses — MUI's own `LocalizationProvider` (105KB) was being bundled straight into
      `dist/TemporalLocalizationProvider-*.js`, creating a second React Context instance a
      real consuming app's `<DatePicker>` couldn't see (MUI X error #149). Fixed with
      regex-based external matching; full writeup in `DECISIONS.md`. Never caught by any
      test/story in this repo, since none of them consume the built `dist/` output through
      Rollup's bundler — exactly what this milestone's manual smoke test exists to catch.
- [x] `pnpm pack` + installed into a scratch Vite + React + TypeScript app (`pnpm create vite`,
      real deps installed normally); driven with Playwright against a real, current Chromium
      (confirmed to have native Temporal support)
- [x] Confirmed subpath default-export and root-barrel named-export imports resolve to the
      exact same function (`Object.is`-equal)
- [x] Confirmed a `DatePicker` built manually via `createTemporalAdapter()` renders and holds a
      real value (native Temporal); confirmed `TemporalLocalizationProvider` renders correctly
      both natively and with `forcePolyfill` forced on; confirmed a `DateCalendar` under
      `TemporalLocalizationProvider` with `forceWeekInfoFallback` forced on and
      `adapterLocale="fr-FR"` renders genuinely correct Monday-first French weekday headers —
      zero console/page errors. Consumer app's own `tsc -b` (against our shipped `.d.ts`
      files) type-checks cleanly.
- [x] `tsc --noEmit`, `pnpm lint`, `pnpm format:check`, `pnpm test:all` (103 tests), and
      `pnpm build` on the main repo all re-verified clean after the `vite.config.ts` fix

## Milestone 9 — Commit hygiene + CI/CD

- [x] `commitlint.config.js`
- [x] `.lintstagedrc.json`
- [x] `.husky/commit-msg`, `.husky/pre-commit` (`prepare` script + all devDependencies were
      already in `package.json` from an earlier scaffold pass — only the hook scripts themselves
      were missing). Verified live: a non-conventional message is rejected, lint-staged runs
      ESLint --fix + Prettier --write on staged files.
- [x] `.releaserc.json` (semantic-release plugin pipeline: commit-analyzer, release-notes-generator,
      changelog, npm, git — `[skip ci]` message — github)
- [x] `.github/workflows/ci-checks.yml` (reusable `workflow_call`)
- [x] `.github/workflows/validate.yml` (calls ci-checks.yml, separate storybook-tests job,
      coverage-comment job via `davelosert/vitest-coverage-report-action`)
- [x] `.github/workflows/storybook-deploy.yml` (`workflow_run` off "Release" + manual dispatch)
- [x] `vitest.config.ts`: added `coverage.reporter: ['text', 'json-summary', 'json']` — required
      by the coverage-comment action, wasn't needed before this milestone
- [x] One-time setup: branch protection on `main` requiring both `ci-checks` and
      `Storybook interaction tests` (via `gh api`)
- [x] One-time setup: GitHub Pages source = "GitHub Actions" (via `gh api`) — surfaced a real,
      unexpected finding: the account has a `cutterscrossing.com` custom domain that Pages
      inherited instead of the default `cutterbl.github.io`; kept it (user's explicit choice),
      enabled `https_enforced`, updated all 4 README references — see `DECISIONS.md`
- [x] PR #1 opened `feat/initial-implementation` → `main`, proved `validate.yml` end-to-end
      (all three checks passing twice, incl. the coverage PR comment), merged as a real merge
      commit (`bde1b6b`) — no separate throwaway PR needed, this doubled as it
- [x] One-time setup: manual npm placeholder publish (`0.0.1`, `--provenance=false` override
      needed locally since `publishConfig.provenance: true` can't auto-detect a CI provider
      outside actual CI — see `DECISIONS.md`), never git-tagged, version reverted locally after
- [x] One-time setup: npm Trusted Publisher configured against `release.yml` (owner `cutterbl`,
      repo `mui-temporal-adapter`) — also enabled npm's strictest 2FA publishing-access setting
      ("require 2FA, disallow bypass tokens"), confirmed via npm's own docs this doesn't affect
      OIDC/Trusted Publisher auth, only classic token publishing — see `DECISIONS.md`
- [x] `.github/workflows/release.yml` added on its own branch (`chore/add-release-workflow`),
      merged via PR #2 — **first run failed**: `@semantic-release/git`'s push to `main` was
      rejected by branch protection (structural gap, not this repo's misconfiguration — see
      `DECISIONS.md`). Fixed via a fine-grained `RELEASE_GITHUB_TOKEN` PAT secret used only for
      that one checkout/push step; fix on its own branch (`fix/release-workflow-push-token`)
- [x] Merged the push-token fix (PR #3) — push worked this time, but `npm publish` itself failed
      with a misleading `ENEEDAUTH` (known npm CLI diagnostics gap, npm/cli#9088 — real cause:
      the upgraded npm CLI likely wasn't what the `npm publish` subprocess resolved via `PATH`).
      Also had to delete a premature `v1.0.0` tag that had already been pushed before the
      failure, to stop the next run from thinking the release was already done — see
      `DECISIONS.md`. Confirmed nothing published to npm yet (`0.0.1` placeholder only); the
      landed `chore(release): 1.0.0 [skip ci]` commit was left on `main` as-is
- [x] Fix on its own branch (`fix/release-npm-version`, PR #4) — explicit `GITHUB_PATH` prepend +
      diagnostic step. Also caught and fixed two more real bugs before merging (user-directed):
      the `release` job never ran `pnpm run build` (would have published an empty package — the
      earlier failed attempt's tarball proved this: only 3 files, no `dist/`), and Husky's
      `prepare` script running silently in every CI job/during `npm publish` itself — made the
      CI-skip explicit rather than relying on Husky's undocumented-to-us internal detection
- [x] **Milestone 9 complete, verified end-to-end for real:** merged PR #4 → `release.yml` ran
      clean → `@cxing/mui-temporal-adapter@1.0.0` published to npm via OIDC (33 files, 158KB
      unpacked — a real build, not the earlier empty one), tagged `v1.0.0`, GitHub Release
      created with generated notes, `chore(release): 1.0.0 [skip ci]` commit on `main`.
      `storybook-deploy.yml` fired automatically afterward and succeeded; confirmed the live site
      at `https://cutterscrossing.com/mui-temporal-adapter/` returns HTTP 200. Four PRs total to
      get here (#1 initial merge, #2 release.yml, #3 push-token fix, #4 npm-version + build +
      husky fixes) — every failure mode hit along the way is fully written up in `DECISIONS.md`
      for any future session standing up a similar semantic-release + protected-branch pipeline
- [x] Post-completion fix (user-directed): `release.yml` no longer runs its own `ci-checks` job —
      branch protection already requires `validate.yml`'s checks to pass before anything merges
      into `main`, so re-running typecheck/lint/coverage/build a second time on every release push
      was pure duplicated work. See `DECISIONS.md`.

## Milestone 10 — Documentation consistency pass

- [x] Re-read all 8 MDX pages back-to-back for undefined jargon/acronyms and tone drift — found
      and fixed a real one ("CLDR" named but unexplained/un-linked); see `DECISIONS.md`
- [x] Spot-check JSDoc renders sensibly in editor tooltips — read all three public-API entry
      files directly; all clear and precise
- [x] Spot-check JSDoc renders sensibly in Storybook autodocs prop tables — found and fixed a
      real gap: `TemporalLocalizationProvider` had no autodocs page at all despite `PLAN.md`
      explicitly calling for one. Added `stories/TemporalLocalizationProvider.stories.tsx`;
      verified via Playwright against the real built site (prop table populated, story renders
      a working picker). Also caught and fixed a broken Glossary anchor (`#cldr` →
      `#cldr-common-locale-data-repository`, real slug ≠ assumed one) and a sidebar-grouping bug
      in the new story file itself, both before committing — see `DECISIONS.md`
- [x] `eslint-plugin-jsdoc` clean across `src/**` — reconfirmed
- [x] Post-completion polish (user-directed): sidebar top-level order fixed to
      `Docs, Setup, Locales, Pickers, How It Works` via `storySort`'s `order` option (combined
      with `method: 'alphabetical'`, which still governs the numbered `Docs` sub-pages);
      simplified the three Lazy Polyfill Environment stories' descriptions to a short, consistent
      plain-English template. Both verified against the real built site — see `DECISIONS.md`
- [x] Post-completion polish (user-directed): linked out to MDN's Temporal reference from
      `Introduction.mdx`, `GettingStarted.mdx`, and `Glossary.mdx` — verified each rendered link
      and that the MDN URL itself resolves — see `DECISIONS.md`

## Notes / blockers

_(nothing yet)_
