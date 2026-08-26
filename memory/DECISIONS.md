# Decision log

Every architectural/process decision made during planning, in the order settled, each with the
rationale and the rejected alternative where one exists. Appended to (never edited away) as
implementation-time spikes get resolved — see the "Open spikes" section at the bottom for what's
still pending.

## Planning-phase decisions

### 1. `TDate = Temporal.ZonedDateTime`

**Decision:** Back the adapter's date type with `Temporal.ZonedDateTime` (date + time + IANA zone).
**Why:** MUI's adapter interface is generic over one `TDate` used across DatePicker, TimePicker,
and DateTimePicker alike, and MUI's timezone-aware methods expect the adapter to resolve an IANA
zone. `ZonedDateTime` is the only Temporal type that covers all of that with one type.
**Rejected alternatives:** `Temporal.PlainDateTime` (no timezone — MUI's timezone support would
need bolt-on handling); `Temporal.PlainDate` (date-only — couldn't back TimePicker/DateTimePicker,
so this couldn't be a single drop-in adapter).

### 2. Async factory (`createTemporalAdapter()`) resolving to the adapter _class_

**Decision:** Public entry point is `async function createTemporalAdapter(): Promise<AdapterTemporalConstructor>`.
Consumers `await` it once, then hand the resolved class to `LocalizationProvider`'s `dateAdapter` prop.
**Why:** MUI's `LocalizationProvider` types `dateAdapter` as `new (...args) => MuiPickersAdapter` and
calls `new DateAdapter(...)` synchronously internally — it can never `await` anything. Resolving to
the _class itself_ (not an instance) is what makes an async bootstrap compatible with that
synchronous contract.
**Rejected alternative:** synchronous class with an internal readiness gate (methods throw/no-op
until a background-kicked-off polyfill load resolves) — risks runtime errors on first render in
environments lacking native Temporal.

### 3. Temporal polyfill installed onto `globalThis.Temporal`, not a bespoke accessor

**Decision:** When native `Temporal` is absent, dynamically import `temporal-polyfill/global`
(self-installing) so `Temporal` becomes a real ambient global, same as if it shipped natively.
**Why:** User's explicit direction — "Once Temporal is loaded (if required), it should be globally
available, as would be expected in normal use of Temporal. A developer learning to use Temporal is
going to go to documentation (like MDN) and expect to do things as they're documented." This
reversed an earlier draft that cached the resolved `Temporal` namespace in a module singleton and
exposed it only via a package-specific `getTemporal()` export — rejected because it would force
consumers to learn a bespoke indirection instead of using Temporal exactly as documented upstream.
**Package choice:** `temporal-polyfill` (lightweight, ~20KB) over `@js-temporal/polyfill` (TC39
reference implementation, more spec-complete but notably larger) — chosen for the "on demand,
minimal cost" lazy-load goal.

### 4. Week-info fallback: hand-rolled static table, not a third-party package

**Decision:** When `Intl.Locale.prototype.getWeekInfo` is unsupported, dynamically import our own
small `locale → firstDay` table (CLDR-sourced) rather than a dependency like `weekstart`.
**Why:** No new runtime dependency, easy to audit/extend, tiny chunk size, and sourced from the
same CLDR week-data that backs the native API so the two paths agree.

### 5. Default locale = `Intl.DateTimeFormat().resolvedOptions().locale`

**Decision:** When `AdapterTemporal` is constructed with no explicit locale, default to
`Intl.DateTimeFormat().resolvedOptions().locale`, not `navigator.language`.
**Why:** It's the exact locale identifier ICU will actually use for the adapter's own internal
`Intl.DateTimeFormat`/`Intl.Locale#getWeekInfo` calls, so "default locale" and "locale actually
driving formatting" can never drift apart. It's pure ECMA-402 (no DOM dependency), so it works
identically in the browser and in Node/SSR with no `typeof window` branching — `navigator.language`
doesn't exist server-side.

### 6. Package name & export convention

**Decision:** Package name `@cxing/mui-temporal-adapter`. Every public module
(`createTemporalAdapter`, `AdapterTemporal`, `TemporalLocalizationProvider`) has its own build
entry and its own `export default`, importable by subpath
(`@cxing/mui-temporal-adapter/createTemporalAdapter`) as the documented/preferred form. The root
barrel re-exports each as a named export, so the root-import form also works.
**Why:** User's explicit choice, confirmed via a direct question: this mirrors `@mui/material`'s
per-component default-export convention.
**Rejected alternative:** `@mui/x-date-pickers`'s own convention actually uses _named_ exports even
at deep subpaths (`import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'`) — flagged as a
real discrepancy with the user's literal example syntax before deciding; user explicitly chose the
default-export/`@mui/material`-style convention over matching x-date-pickers' own convention.
**Build implication:** requires a multi-entry Vite library build (one output file + `.d.ts` per
public module) instead of a single-entry bundle.

### 7. `TemporalLocalizationProvider`: `use()` + `<Suspense>`, not `useEffect` + a `fallback` prop

**Decision:** The optional convenience wrapper is built on React 19's `use()` hook plus a
caller-supplied `<Suspense>` boundary, backed by a module-level cached `adapterPromise` singleton.
No `fallback`/`onError` props on the component itself.
**Why:** This is the standard, documented React 19 mechanism for "await a resource, then render" —
consistent with the general preference (see decision 3) for using platform/framework-standard
mechanisms over bespoke ones. `use()` re-throws a rejected promise into the nearest Error Boundary
automatically, so a custom `onError` prop would just duplicate existing React behavior.
**Rejected alternative:** an earlier draft used `useState`/`useEffect` with explicit `fallback` and
`onError` props — replaced once the `use()`/`Suspense` approach was proposed and preferred.

### 8. ESM-only package (no CJS output)

**Decision:** Published package is ESM-only — no `require`/CJS `exports` condition, no `main`
field, `vite.config.ts`'s `build.lib.formats` is `['es']` only.
**Why:** User's explicit direction ("Built publishable package should only be available as an
ESM"). CommonJS-only consumers (old Jest configs, ts-node CJS projects) simply can't `require()`
this package — documented plainly in the README as an accepted tradeoff.

### 9. Unit-testing stack: Vitest + React Testing Library, not Jest

**Decision:** Component-level tests use Vitest (`component` project, jsdom environment) with
`@testing-library/react`/`@testing-library/user-event`/`@testing-library/jest-dom` (via its
`/vitest` matcher entry point) — no Jest anywhere in the project.
**Why:** User's explicit standing convention ("we use vitest+testing library for unit testing, not
Jest"), stated as a correction after an early CJS-consumer note happened to mention Jest.

### 10. npm publish auth: Trusted Publisher / OIDC, no stored `NPM_TOKEN`

**Decision:** `release.yml` authenticates to npm via OIDC (npm's Trusted Publisher feature) instead
of a classic `NPM_TOKEN` repository secret.
**Why:** Eliminates a long-lived credential sitting in the repo's secrets; current npm best
practice. Confirmed via direct question (recommended option chosen).
**Caveat:** npm's trusted-publishing flow generally expects the package to already exist — the
very first publish may need to happen once manually before OIDC trust can be configured against it;
confirm current npm behavior at implementation time (see Open spikes).

### 11. Coverage gate scope: `unit` + `component` projects only

**Decision:** The 85% branch / 90% function coverage threshold applies only to the `unit` (node)
and `component` (jsdom) Vitest projects. The `storybook` (Playwright browser-mode) project remains
its own separate pass/fail check in CI, not folded into the coverage numbers.
**Why:** Confirmed via direct question (recommended option). Browser-mode v8 coverage collection
merged into one report alongside two other projects is more fragile to keep reliable; excluding it
keeps the numeric gate fast and dependable while the browser project still has to pass on its own.

### 12. Changelog: committed back to the repo via `@semantic-release/git`

**Decision:** `release.yml`'s semantic-release pipeline includes `@semantic-release/changelog` +
`@semantic-release/git`, committing the bumped `package.json` + `CHANGELOG.md` back to `main` with
`[skip ci]` in the commit message (to avoid re-triggering the workflow).
**Why:** Confirmed via direct question (recommended option) — keeps the changelog visible directly
in the repo, not only on GitHub's Releases page.
**Rejected alternative:** no commit-back, relying solely on GitHub Releases notes + npm registry
metadata — would keep `main`'s history purely human-authored, but was not the chosen tradeoff.

### 13. No `eslint-plugin-jsx-a11y`, no `@storybook/addon-a11y`

**Decision:** Neither the ESLint config nor the Storybook addon list includes an accessibility
linter/checker.
**Why:** User's explicit direction — this package authors no DOM-rendering UI of its own.
`TemporalLocalizationProvider` composes `LocalizationProvider`/`<Suspense>` (no markup), and the
stories render MUI's own picker components, whose accessibility is `@mui/x-date-pickers`'s concern,
not markup this package produces. An a11y linter/checker here would just flag JSX that belongs to
the upstream library.

### 14. Package manager: pnpm

**Decision:** Use pnpm (not npm) for all local install/run/build/test/pack commands throughout the
project and its documentation. Pin the version via a `"packageManager"` field in `package.json`
(Corepack-managed) so CI and every contributor resolve the same pnpm version.
**Why:** User's explicit direction, given while `git init` was underway.
**Implication:** `npm ci` → `pnpm install --frozen-lockfile`; `npm run <script>` → `pnpm <script>`;
`npm pack`/`npm view` → `pnpm pack`/`pnpm view`; Husky hooks invoke tools via `pnpm exec` instead of
`npx`; GitHub Actions workflows install pnpm via `pnpm/action-setup` before `actions/setup-node`
(with `cache: 'pnpm'`), per pnpm's own CI setup guidance (pnpm must be on PATH before Node's cache
step can find the pnpm store). The lockfile is `pnpm-lock.yaml`, not `package-lock.json`.
**Not affected:** `@semantic-release/npm` still publishes to the npm _registry_ via the npm CLI
internally regardless of pnpm being the local package manager — that's an implementation detail of
the semantic-release plugin, not something the project needs to configure around. npm Trusted
Publisher / OIDC setup on npmjs.com is likewise unaffected — it governs registry publish auth, not
local tooling.

### 15. `./memory/` progress-tracking system, committed to the repo

**Decision:** `PLAN.md`, `DECISIONS.md` (this file), and `PROGRESS.md` live in the repo at
`./memory/`, created as the first action of Milestone 0, and are _not_ gitignored.
**Why:** User's explicit request, driven by wanting to review progress incrementally and be able to
pick up cleanly after any interruption — committing them (rather than keeping them as a local-only
scratch dir) means they travel with the code, are reviewable in PRs, and let any session (this one
resumed, or a fresh one) pick up with full context instead of re-deriving it.

## Implementation-time decisions

### `package.json` `exports` map: generic `"./*"` pattern, not one entry per module

**Decision:** Replace the originally-planned hand-enumerated `exports` map (one explicit subpath
key per public module — `./createTemporalAdapter`, `./AdapterTemporal`,
`./TemporalLocalizationProvider`) with a single generic pattern:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./*": { "types": "./dist/*.d.ts", "import": "./dist/*.js" },
  "./package.json": "./package.json"
}
```

**Why:** User's explicit direction — the list of public modules will grow, and hand-enumerating
every subpath in `package.json` means remembering to edit two places (the `exports` map and
`vite.config.ts`'s `build.lib.entry` map) every time one is added, which drifts out of sync
easily. The `"./*"` pattern maps any subpath directly to the matching flat `dist/` output file
(both Node's and TypeScript's `exports`-field resolution support `*` pattern trailers in both the
key and the value), so the **only** place that needs an edit when a new public module is added is
`vite.config.ts`'s entry map — the export becomes available automatically the moment the build
emits that file. No functional change to any subpath already documented in this plan
(`@cxing/mui-temporal-adapter/createTemporalAdapter` etc. still resolve exactly the same way); this
only changes how the mapping is expressed, not what resolves.
**Consequence:** `vite.config.ts`'s `build.lib.entry` map is now the single source of truth for
"what is a public module" — worth calling out clearly in a code comment there when Milestone 4
authors it, since it's easy to forget that adding an entry there is now sufficient on its own.

### `ensureTemporal`'s `force` option must delete the global first (Milestone 1)

**Finding:** `temporal-polyfill/global`'s installer (`shim.js`) computes
`const NativeTemporal = globalThis.Temporal;` at its own module-evaluation time and skips
installing if that's truthy — it treats _any_ pre-existing `globalThis.Temporal` as "native,"
not just a genuine engine intrinsic. So the original design (re-`import()` the same specifier
to force a reinstall over an already-present global) silently no-ops: the import resolves to a
module that, even freshly evaluated, still sees the existing value and refuses to overwrite it.
**Decision:** `ensureTemporal({ force: true })` now explicitly `delete`s
`globalThis.Temporal` before importing, so the polyfill's own native-check genuinely sees
`undefined` and installs. This is also what makes `force`/`forcePolyfill` actually useful for the
`LazyPolyfillEnvironment` Storybook story later (Milestone 7) — without this fix, forcing the
polyfill path in a browser that _does_ have native Temporal wouldn't have worked either.
**Testing note:** discovered via a failing test, not by reading the polyfill's source first — the
underlying mechanism (dynamic `import()` of the same specifier is cached across test files within
one Vitest run) is also why the tests call `vi.resetModules()` before any assertion that expects a
genuine (re-)installation to occur, rather than relying on execution order between test files.

### Fallback table keyed by region, resolved via `Intl.Locale().maximize()` (Milestone 1)

**Decision:** `getFirstDayOfWeek()` resolves the fallback table by region code (e.g. `"US"`,
`"FR"`), using `new Intl.Locale(localeCode).maximize().region` to fill in the likely region for
locale tags that don't specify one (e.g. `"fr"` → region `"FR"`) — rather than the plan's original
sketch of a plain `localeCode.split('-')[0]` language-subtag fallback.
**Why:** CLDR week-data (which both the native API and our fallback table are sourced from) is
fundamentally keyed by region/territory, not language — a naive language-subtag split would key
the table wrong for any locale tag lacking an explicit region, and `Intl.Locale`'s own
likely-subtags resolution (`maximize()`) is the standard, already-available mechanism for filling
that in correctly, with no extra dependency.
**Table contents:** only regions that differ from the Monday default are enumerated (Sunday-start:
US, CA, MX, BR, JP, KR, TW, HK, PH, TH, IL, ZA, CO, VE, PE, DO; Saturday-start: EG, SA, AE, QA, KW,
BH, OM, JO, SY, IQ, DZ, MA, TN, LY, YE, AF) — everything else defaults to Monday, keeping the table
genuinely small per decision 4, rather than attempting an exhaustive CLDR mirror.

### `ensureTemporal` superseded: install directly from `temporal-polyfill/implementation` (Milestone 2)

**Finding:** The Milestone 1 "delete the global first" fix (previous entry) was still incomplete.
`temporal-polyfill/global`'s self-install is a one-time side effect of evaluating that module — a
dynamic `import()` of an already-evaluated module specifier returns the cached module without
re-running its top-level code. So a _second_ `force: true` call (e.g. a consumer calling
`createTemporalAdapter({ forcePolyfill: true })` on a page where `Temporal` — native or
already-polyfilled — was installed earlier) would `delete globalThis.Temporal`, then get back the
already-evaluated `/global` module, whose install step never re-runs — leaving `globalThis.Temporal`
`undefined` afterward. Caught by an end-to-end smoke test exercising `forcePolyfill: true` after a
prior, unforced `createTemporalAdapter()` call in the same process — not by the Milestone 1 unit
tests, since each of those only ever forces once, from a clean module registry.
**Decision:** `ensureTemporal()` no longer imports the self-installing `temporal-polyfill/global`
entry point at all. It imports `temporal-polyfill/implementation` instead — a public, stable subpath
in the polyfill's own `exports` map whose `Temporal` export is the polyfill's own implementation,
unconditionally (no `NativeTemporal ||` preference baked in, unlike the package's base entry point)
— and assigns it onto `globalThis.Temporal` itself, in `ensureTemporal`'s own function body, every
time it's called with `force: true`. Because the assignment is code we control (not a module's
cached side effect), it's correct no matter how many times this has already run or what it last
did. The `delete globalThis.Temporal` step is no longer needed either, for the same reason.
**Consequence:** simpler implementation overall (one `import()` + one assignment, no `delete`), and
the two Milestone 1 test files' comments/`vi.resetModules()` calls referencing the old mechanism
were updated/removed accordingly — both still pass unchanged in behavior.

### `getInvalidDate()` sentinel design — RESOLVED (Milestone 2)

**Decision:** `getInvalidDate()` returns a real, constructible `Temporal.ZonedDateTime` pinned to a
fixed sentinel instant — JS `Date`'s own minimum representable value
(`-8_640_000_000_000_000` epoch ms) in the `'UTC'` zone — rather than attempting to represent a
genuinely invalid value (Temporal has none). `isValid(value)` returns `false` for `null` and for any
value at exactly that sentinel instant, `true` otherwise. Implemented in `src/utils/invalid.ts`
(`createInvalidDate()` / `isValidZonedDateTime()`), shared by `AdapterTemporal.getInvalidDate`/`.isValid`
and by `AdapterTemporal.date()`'s own unparseable-input fallback.
**Why:** This was flagged as an open spike back in planning (originally slated for Milestone 3, but
resolved now since it has no dependency on the format/parse token engine). The chosen instant is
comfortably inside Temporal's much wider supported range but far enough outside any realistic
picker value to avoid colliding with a genuine date a consumer constructs.
**Rejected alternative:** a `WeakSet`/instance-flag-based sentinel — rejected as more moving parts
for no real benefit; a fixed, well-documented instant is simpler and just as reliable, since no
real-world date will legitimately equal it.

### `getDayOfWeek()` is locale-relative, not raw ISO (Milestone 2)

**Finding:** Cross-checked `AdapterLuxon`'s actual implementation before writing this method —
`getDayOfWeek = value => value.localWeekday ?? value.weekday` — confirming the `MuiPickersAdapter`
interface's terse doc comment ("1-based, 1 = first day of the week, 7 = last day of the week") means
_locale-relative_ first day, not ISO Monday-first. Calendar-grid rendering aligns columns using this
value together with `startOfWeek()`'s own locale-aware first day, so the two must agree.
**Decision:** `AdapterTemporal.getDayOfWeek()` computes `((value.dayOfWeek - firstDay + 7) % 7) + 1`
using the same `getFirstDayOfWeek(this.locale)` lookup `startOfWeek()`/`endOfWeek()` already use —
`1` is always this adapter's locale's first day of the week, `7` its last.
**Why it mattered:** using raw ISO `dayOfWeek` (Monday-first) directly would have silently
misaligned calendar-grid columns for any locale whose week doesn't start on Monday (e.g. `en-US`),
without failing any type check — this was a correctness gap that copying the interface's own JSDoc

- another adapter's real behavior caught before it shipped, not something a smoke test happened to
  exercise.

### `'default'` and `'system'` timezones both resolve to the runtime's current zone (Milestone 2)

**Decision:** `src/utils/timezone.ts`'s `resolveZone()` maps both the `'default'` and `'system'`
picker-timezone values to `Temporal.Now.timeZoneId()` — the same concrete IANA zone id.
**Why:** `Temporal.ZonedDateTime` has no separate "this was deliberately the system zone at creation
time" marker the way some date libraries' `Zone` objects do (e.g. Luxon's zone `type: 'system'`) —
every zone a `ZonedDateTime` carries is just a concrete IANA identifier. `dayjs`'s own adapter
collapses `'default'` to "no explicit zone" (effectively system-local) the same way, for the same
underlying reason. A consequence: `AdapterTemporal.getTimezone()` always reports the concrete zone
id (e.g. `'America/New_York'`), never the literal string `'system'` — a minor, documented divergence
from Luxon/dayjs's adapters, not a functional gap.

### Milestone 2 checklist gap-fill: entry-point files (Milestone 2)

**Finding:** Neither `src/createTemporalAdapter.ts` nor the root barrel `src/index.ts` had an
explicit checklist line in `PROGRESS.md`'s Milestone 2 (or anywhere in Milestones 0–4) — an oversight
in the original plan, even though `createTemporalAdapter()` has no dependency on Milestone 3's
format/parse engine and `AdapterTemporal` alone isn't part of the package's intended public API
surface (consumers only ever get it via the factory).
**Decision:** Authored both now, as part of finishing Milestone 2, since without them the adapter
couldn't even be exercised end-to-end for this milestone's own smoke-testing. `PROGRESS.md` amended
to record this. `TemporalLocalizationProvider.tsx` (the optional React `use()`/`Suspense` wrapper)
remains genuinely deferred — it needs the `component` Vitest project (jsdom + Testing Library),
which isn't wired until Milestone 5 — but `PROGRESS.md`'s Milestone 4 checklist now explicitly notes
it needs to exist before that milestone's build-entry wiring can reference it.

### `any` banned outright — enforce via ESLint, not just `strict` (flagged Milestone 2, applies Milestone 6)

**Decision:** No TypeScript file in this package may use `any` — implicit or explicit. `tsc`'s
`strict: true` already catches _implicit_ `any` (`noImplicitAny`), and a repo-wide check
(`grep -rn '\bany\b' src test`) at the time this was raised found zero actual type-position uses
(only prose hits in comments/JSDoc, e.g. "any subset of the default formats"). But `strict` alone
does **not** catch a deliberately-written `x: any` or `as any` — that requires
`@typescript-eslint/no-explicit-any` set to `"error"` explicitly in `eslint.config.js` (its
severity under the `recommended`/`recommendedTypeChecked` presets isn't reliable enough on its own
to depend on).
**Why:** User's explicit direction — "TS should never use `any`. Should be enforced, if possible."
**How to apply:** When authoring `eslint.config.js` in Milestone 6, explicitly set
`'@typescript-eslint/no-explicit-any': 'error'` (don't just inherit whatever the preset defaults
to), and re-run the same `grep -rn '\bany\b' src test` sanity check once the whole method inventory
(Milestones 3–5) exists, to confirm nothing crept in before the linter was there to catch it. Add
this as an explicit Milestone 6 checklist line in `PROGRESS.md` (done) so it isn't lost between now
and then.
**Applied (Milestone 6):** `eslint.config.js` sets `'@typescript-eslint/no-explicit-any': 'error'`
explicitly, not relying on the preset default (see the `typescript-eslint vs. TypeScript 7.x` entry
below for how `eslint.config.js` itself came together). `pnpm lint` is clean across `src/`/`test/`
with this rule active, and a repeat `grep -rn '\bany\b' src test` still finds zero type-position
uses.

### Hand-rolled format/parse token engine: `D`/`DD`/`T` macros expand via `Intl`, formatted through the same token pipeline, not raw `toLocaleString()` (Milestone 3)

**Decision:** `src/format/{tokenizeFormat,formatByToken,parseByToken,expandFormat,fieldTokens}.ts`
implement the Luxon-style token vocabulary from `defaults.ts`'s `formatTokenMap`, plus three
locale macros (`D`, `DD`, `T`) used by several of `defaultFormats` (`keyboardDate`, `fullDate`,
`keyboardDateTime24h`/`12h`). `AdapterTemporal.formatByString`/`parse`/`expandFormat` now delegate
to this engine instead of throwing; `parse()` calls `expandFormat()` internally first so macro
tokens are parseable too, and — having no `timezone` parameter of its own — builds its result in
the runtime's current zone (`resolveZone('system')`), matching how other adapters fall back to
their library's default zone here.
**Why:** Temporal has no format-string engine of its own (unlike Luxon/dayjs/moment) — this is
genuinely new surface, not something to delegate to `Temporal.ZonedDateTime.toLocaleString()`
alone, since MUI X's keyboard-editable fields need each token to correspond to one
independently-editable section, which a single opaque locale string can't provide.
**Two real bugs found and fixed via an end-to-end smoke test** (not committed; the usual pattern
for this project — see the Milestone 1/2 `ensureTemporal` entries above):

1. **Macro-token digit padding vs. field-token expansion could disagree.** The first
   `expandMacroToken()` draft hardcoded unpadded tokens (`'d'`, `'M'`, `'H'`) for the `D`/`DD`/`T`
   macros' numeric fields, but `formatByToken()`'s own `'D'`/`'DD'`/`'T'` cases delegated straight
   to `value.toLocaleString()` — and some locales' `numeric` style _is_ zero-padded by CLDR
   convention (confirmed via `fr-FR`: `format(value, 'keyboardDate')` produced `"05/03/2024"`, but
   `expandFormat('D')` produced the unpadded `"d/M/yyyy"` — meaning a `DateField` rendering
   per-section from the expanded tokens would show unpadded digits while `format()` elsewhere on
   the same named format showed padded ones). **Fix:** `partsToFormat()` now detects padding by
   reading the actual rendered digit length at a reference date deliberately chosen to be
   unambiguous (day 1, month January, hour 1 — each naturally single-digit unless the locale pads),
   rather than assuming a fixed token per field.
2. **Macro tokens rendered in the locale's native numbering system, breaking round-trip parsing.**
   `formatByToken()`'s original `'D'`/`'DD'`/`'T'` cases called `value.toLocaleString()` directly,
   which for locales like `ar-SA` renders Arabic-Indic digits (e.g. `"٥‏/٣‏/٢٠٢٤"`) — but every other
   digit token in this engine deliberately stays plain ASCII (`parseByToken()`'s digit matching is
   ASCII-only `\d`, and MUI's own extension point for alternate numbering systems is
   `AdapterTemporal.formatNumber()`, called by MUI's field-rendering layer itself, not by this
   engine). **Fix:** `formatByToken()`'s `D`/`DD`/`T` cases now expand the macro via
   `expandMacroToken()` (exported from `expandFormat.ts` for this reuse) and format the resulting
   token sequence through `formatByToken()` itself, recursively — same technique used to catch
   fix #1, now also guaranteeing ASCII digit output. This required moving `SUPPORTED_FIELD_TOKENS`
   out of `formatByToken.ts` into its own `fieldTokens.ts` module, to avoid a circular import
   (`formatByToken.ts` needing `expandFormat.ts` needing `formatByToken.ts`).
   **Verification:** smoke-tested round-trip format→parse across `en-US`, `fr-FR`, `ja-JP` (CJK
   names), and `ar-SA` (RTL + native numerals) — including every default named format, the `D`
   expansion/format/parse triple, `yy` 2-digit-year windowing, and a literal-quoted-text format —
   before deleting the throwaway test file. `tsc --noEmit` and `vitest run --project unit` both clean.

## Implementation-time findings (risks noted, not blocking)

### Peer-range lag on bleeding-edge majors (Milestone 0)

**Finding:** `pnpm peers check` flags two unmet peer ranges after installing latest-tagged
packages: `eslint-plugin-react@7.37.5` declares a peer range of `^3 || ^4 || ^5 || ^6 || ^7 || ^8
|| ^9.7` (doesn't yet list ESLint 10 even though ESLint 10.9.1 is installed), and
`typescript-eslint@8.68.0`'s packages declare `typescript >=4.8.4 <6.1.0` (doesn't yet list
TypeScript 7 even though 7.0.2 is installed). Both are cases of plugin maintainers' declared
`peerDependencies` metadata lagging behind genuinely-latest major releases of the tools they
plug into — pnpm only warns (doesn't block install) on this.
**Decision:** Proceed with the installed latest versions as-is rather than downgrading ESLint/TS
to satisfy stale peer metadata — re-verify at the point ESLint config is actually authored and run
(Milestone 6) whether the plugins function correctly in practice despite the metadata gap; if
`eslint-plugin-react`/`typescript-eslint` genuinely fail against ESLint 10/TS 7 at that point (not
just a stale peer range warning), that's when to reconsider, not now.
**Re-verified (Milestone 6):** both genuinely failed, for real (not just stale metadata) — see the
`typescript-eslint vs. TypeScript 7.x` and `eslint.config.js` entries below for the full
investigation and how each was actually resolved (a `typescript` downgrade to 6.x for the
`typescript-eslint` case; a hardcoded `settings.react.version` for the `eslint-plugin-react` one).

## Resolved implementation-time spikes

### TS global `Temporal` typing — RESOLVED (Milestone 0)

**Finding:** TypeScript 7.0.2's bundled `ESNext` lib already ships ambient `Temporal` global
types natively — confirmed by a spike file referencing `Temporal.PlainDate.from(...)` with no
import, which type-checked clean under `lib: ["ESNext", "DOM", "DOM.Iterable"]`, then correctly
flagged a deliberately-wrong assignment (`Temporal.PlainDate` ← `string`) once introduced,
confirming tsc was genuinely checking the file and not silently skipping it.
**Consequence:** This package does **not** need to ship its own ambient `.d.ts` declaring the
`Temporal` global — `temporal-polyfill`'s own types aren't needed for this either, since we never
import it as a value in consumer-facing type positions (see decision 3). The only caveat: a
consumer needs a TypeScript version whose bundled lib includes these types for `Temporal.*` to
type-check in their own app code — worth a one-line callout in the README/docs (not a blocker, and
not something this package can control), but not an open item for us to build.
**Update (Milestone 6):** the project's own `typescript` devDependency was downgraded from 7.0.2 to
6.0.3 (see "typescript-eslint vs. TypeScript 7.x" below) — re-verified directly (a standalone `tsc`
probe against `@typescript/typescript6`, the same TS-6-API-compatible package this finding's
downgrade now uses as the real `typescript`) that 6.0.3 ships the identical ambient `Temporal`
global types and resolves them identically (including correctly rejecting a deliberately-wrong
assignment). This finding's actual consequence is unchanged; only the specific version number is.

### typescript-eslint vs. TypeScript 7.x — RESOLVED, by downgrading `typescript` to 6.x (Milestone 6)

**Finding:** `typescript-eslint@8.68.0` (and its own `@typescript-eslint/parser`/`eslint-plugin`
packages individually — the guard is duplicated in each, not just the meta-package) hard-throws at
`require()` time when it detects `typescript`'s major version is ≥7: `"typescript-eslint does not
support TS 7.0."`, pointing at [a still-open upstream
issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940). Confirmed this isn't
just a stale peer-range warning (as the Milestone 0 peer-lag note speculated might be the case) —
the package's own `peerDependencies` explicitly cap at `typescript: ">=4.8.4 <6.1.0"`, and the
`8.68.1-alpha.3` canary build still carries the identical cap and the identical throw. No released
version supports TS 7 as of this writing.
**What was tried first (all failed to redirect the nested peer resolution):**

- pnpm `overrides` with an `npm:`-aliased target (`typescript-eslint>typescript: npm:@typescript/typescript6@…`)
  across the full `@typescript-eslint/*` dependency subtree — recorded correctly in
  `pnpm config list` and the lockfile's `overrides:` block, but had no effect on the actual resolved
  symlink.
- The same `overrides` mechanism with a plain, non-aliased semver target (`^6.0.3`, pnpm's own
  documented example shape for "Overriding peer dependencies") — sanity-checked against the
  _exact_ documented example (`react-dom>react: 18.3.1`) on a completely unrelated, unambiguous
  peer edge first, to rule out anything specific to the `typescript-eslint` target; the documented
  example itself had no effect either. Also re-tested after bumping the project's pinned pnpm
  version (11.9.0 → 11.24.0, run via `corepack` so the bump is fully project-scoped — see
  `package.json`'s `packageManager` field) in case this was a fixed bug in an older patch; no
  change.
- `packageExtensions` adding `typescript` as a real regular `dependencies` entry (pointing at the
  `@typescript/typescript6` alias) on each affected package — recorded correctly, but a same-named
  `peerDependencies` entry on the same package apparently still wins during linking.
- `pnpm patch` directly editing the resolved `@typescript-eslint/parser`'s own `package.json` (move
  `typescript` out of `peerDependencies`, into `dependencies`, pointed at the alias) — patches are
  applied to files _after_ pnpm's dependency-graph resolution has already run, so this doesn't
  actually change what gets resolved/linked; confirmed the symlink was unaffected by inspecting the
  patched package's own `node_modules/typescript` symlink target.
- Also confirmed, before spending further effort: guard-removal-only (`pnpm patch`ing out just the
  `throw`) was **not** attempted as a real fix, since the guard exists because TypeScript 7+ no
  longer bundles the JS Compiler API these packages actually call into at runtime (the same reason
  `vite-plugin-dts`/`unplugin-dts` needed the `@typescript/typescript6` fallback in Milestone 4) —
  bypassing the version check without also fixing what `require("typescript")` resolves to would
  likely trade one clean, obvious error for a much harder-to-diagnose one deeper in real lint runs.

**Decision (user-confirmed, options presented directly):** downgrade the project's own `typescript`
devDependency from `^7.0.2` to `^6.0.3` (the real, current, published 6.x line — not the
`@typescript/typescript6` alias, which is no longer needed anywhere once real `typescript` itself is
6.x, and was removed as a devDependency). Rejected alternative: defer Milestone 6 indefinitely until
typescript-eslint ships TS 7 support upstream — rejected because it has no known timeline and would
leave `@typescript-eslint/no-explicit-any` (the standing `any`-ban directive) permanently
unenforced.
**Verified before deciding:** TypeScript 6.0.2 (`@typescript/typescript6`, used as a stand-in to
probe this before committing to the downgrade) fully type-checks `Temporal.*` usage identically to
7.0.2 — same ambient global types, same rejection of a deliberately-wrong assignment. So this
downgrade does **not** reopen decision 1's/Milestone 0's Temporal-typing finding in any meaningful
way; see the "Update (Milestone 6)" note added to that entry above.
**Verified after deciding:** `typescript-eslint` now `require()`s cleanly; `tsc --noEmit`, `pnpm
build`, and the full `unit`+`component` test suite (93 tests) all stayed green across the downgrade
with zero source changes required beyond the version bump itself and removing the now-unnecessary
`@typescript/typescript6` devDependency.

### `eslint.config.js` authored — two further real environment quirks found and worked around (Milestone 6)

Beyond the TS-version issue above, two more genuine tooling quirks surfaced while actually running
the config (not just from stale peer-range metadata):

- **`typescript-eslint`'s type-checked base config has no file scoping of its own.** Spreading
  `...tseslint.configs.recommendedTypeChecked` directly (as an early draft did) applies the
  TypeScript parser — and every type-aware rule — to _every_ linted file, including plain `.js`
  config files like `eslint.config.js` itself, which crashes immediately (`@typescript-eslint/*`
  rules that need type info throw when the file isn't part of a TS program). Fixed by using
  typescript-eslint's own documented `{ files: ['**/*.{ts,tsx}'], extends: [...] }` pattern instead
  of an unscoped spread.
- **`eslint-plugin-react@7.37.5`'s `settings.react.version: 'detect'` crashes under ESLint 10**
  (`contextOrFilename.getFilename is not a function`) — its version-detection code still calls the
  ESLint `context.getFilename()` method, removed in ESLint 10 in favor of the `context.filename`
  property. This is exactly the kind of peer-range-lag breakage the Milestone 0 note flagged as
  worth re-checking here. Worked around by hardcoding `settings.react.version` to the installed
  React major (`'19.2'`) instead of `'detect'` — every other `eslint-plugin-react` rule exercised
  (the `flat.recommended`/`flat['jsx-runtime']` rule sets) works fine under ESLint 10; only this one
  specific detection code path is broken. Revisit `'detect'` once `eslint-plugin-react` ships an
  ESLint-10-clean release.

Also found and fixed, via real lint findings once the config actually ran (not pre-existing, latent
issues — these only surfaced because `pnpm lint` had never been run against this codebase before):
a genuinely-missing JSDoc description on `AdapterTemporal`'s constructor and on `MacroToken`'s type
alias; an `as MacroToken` cast in `formatByToken.ts` that TypeScript 6 (unlike 7) correctly flags as
unnecessary (control-flow narrowing through the `case 'D': case 'DD': case 'T':` switch already
narrows `token` to the literal union); and a real `@typescript-eslint/no-unsafe-member-access` false
positive specifically on `Intl.Locale.prototype.getWeekInfo` (accessed via the _constructor's_
`.prototype`, not an instance) under TS 6.x's `esnext.intl` lib — verified as a genuine false
positive by cross-checking with a direct `tsc --noEmit` probe (which resolves the real, non-`any`
`WeekInfo` return type correctly at that same expression); isolated into
`src/week-info/hasNativeGetWeekInfo.ts` with a documented, justified `eslint-disable` so the
explanation is written once, not repeated at every call site.

### `vite-plugin-dts` multi-entry `.d.ts` emission shape — RESOLVED (Milestone 4)

**Finding:** `vite-plugin-dts@5.0.3` is now a thin wrapper around `unplugin-dts`, whose default
(non-bundled) mode emits each processed file's declarations at a path mirroring `src/`'s own
directory structure, relative to `entryRoot` (defaulting to the smallest common root of all
processed files — `src/` here). The four build entries as originally pointed at in `vite.config.ts`
were `src/index.ts`, `src/createTemporalAdapter.ts` (already flat) but `src/AdapterTemporal/AdapterTemporal.ts`
and `src/TemporalLocalizationProvider/TemporalLocalizationProvider.tsx` (nested) — so their
declarations would land at `dist/AdapterTemporal/AdapterTemporal.d.ts` /
`dist/TemporalLocalizationProvider/TemporalLocalizationProvider.d.ts`, not matching the flat
`dist/AdapterTemporal.js` / `dist/TemporalLocalizationProvider.js` the `lib.entry` `fileName` map
produces — breaking the flat `./*` wildcard in `package.json`'s `exports` map for those two
subpaths.
**First attempt (rejected):** `bundleTypes: true` (the v5/`unplugin-dts` name for the old
`rollupTypes`), powered by `@microsoft/api-extractor` — rolls each entry's declarations into one
flat file regardless of source nesting, which would have solved this directly. Installed
`@microsoft/api-extractor@^7.59.0` (an explicit devDependency, since `vite-plugin-dts` only lists
it as an optional peer) and `@typescript/typescript6@^6.0.2` (a separate, unrelated requirement —
`unplugin-dts` needs the TS _Compiler API_ to generate declarations at all, which TypeScript 7+
no longer bundles; this package stays regardless of the `bundleTypes` decision below). Hit a real
bug: `Internal Error: Unable to follow symbol for "Promise"` from API Extractor while bundling —
a known API-Extractor limitation, not something fixable from this project's config.
**Decision:** Dropped `bundleTypes`/API Extractor entirely (removed the now-unused
`@microsoft/api-extractor` devDependency) in favor of a simpler fix: added flat, root-level
re-export wrapper files (`src/AdapterTemporal.ts`, `src/TemporalLocalizationProvider.tsx`) that
each just `export { default } from './AdapterTemporal/AdapterTemporal'` (etc.), and pointed
`vite.config.ts`'s `lib.entry` map and `src/index.ts`'s own imports at these flat wrappers instead
of the nested originals. Since all four entries are now flat files directly under `src/`, the
default (non-bundled) `entryRoot`-relative behavior emits every entry's own `.d.ts` flat in
`dist/` too — matching the flat JS filenames — while internal implementation modules (e.g.
`dist/format/formatByToken.d.ts`) still nest, which is harmless since only the flat entry `.d.ts`
files are ever referenced by `exports`. No extra tooling/dependency needed beyond
`@typescript/typescript6`. Verified: `dist/AdapterTemporal.d.ts` and `dist/TemporalLocalizationProvider.d.ts`
both land flat, `tsc --noEmit` and `vitest run --project unit` stay clean, and a throwaway script
importing straight from `dist/` (both the subpath and root-barrel forms) confirmed they resolve to
the _same_ function/class and that a built `AdapterTemporal` instance actually works
(`adapter.date() instanceof Temporal.ZonedDateTime`, `formatByString('D')`, etc.) — not just that
the build didn't error.

### Real bug found — `firstDayOfWeekTable.ts` wasn't actually code-split (Milestone 4)

**Finding:** The first `vite build` emitted an `INEFFECTIVE_DYNAMIC_IMPORT` warning:
`src/week-info/firstDayOfWeekTable.ts` is dynamically imported by `ensureWeekInfo.ts` (as
designed — see Milestone 1) but was _also_ statically imported by `getFirstDayOfWeek.ts`, just to
reach its `DEFAULT_FIRST_DAY` constant. Rollup can't code-split a module that's also reachable via
a static import elsewhere, so the "small fallback table only loads when actually needed" design
goal (stated explicitly in this file's own plan entry, and in Milestone 4's verification
checklist) was silently not holding — the table would ship in every build regardless of whether
the runtime has native `getWeekInfo()` support.
**Fix:** Removed `DEFAULT_FIRST_DAY` from `firstDayOfWeekTable.ts` (it was just the literal `1`,
i.e. Monday — the ISO/CLDR default) and inlined `const DEFAULT_FIRST_DAY = 1` directly in
`getFirstDayOfWeek.ts` instead, with a comment explaining why (this exact code-splitting reason),
so nothing in that module needs to import from `firstDayOfWeekTable.ts` at all. Verified: rebuilt,
the warning is gone, and `firstDayOfWeekTable-*.js` now appears as its own separate chunk in
`dist/`, distinct from the four entry chunks.

### Real bug found — `expandFormat()` could corrupt literal text at a quoted-run boundary (Milestone 5)

**Finding:** Writing the `component`/`unit` test suite (specifically a test round-tripping a stray
unrecognized word like `"foo HH:mm"` through `expandFormat()`) surfaced a real bug: `expandFormat()`
previously called `quoteLiteral()` independently on each literal/unrecognized-word _token_
(one `tokenizeFormat()` piece at a time) rather than on a merged run of adjacent ones. Two
different-letter unrecognized runs landing back-to-back (e.g. `"f"` then `"oo"` from `"foo"`) each
got their own `'...'` wrapping, so the joined output put a closing `'` immediately next to the next
piece's opening `'` (`"'f''oo'"`). A later `tokenizeFormat()` pass over that _same_ string (as
`parse()` does) reads adjacent `''` as the escaped-apostrophe sequence, not as two separate quoted
runs — collapsing `"foo"` into the corrupted `"f'oo"`. Reachable any time a custom/expanded format
string contains two consecutive words built only from letters this adapter doesn't recognize as
tokens.
**Fix:** Rewrote `expandFormat()` (`src/format/expandFormat.ts`) to buffer consecutive literal/
unrecognized-token text into one running string and call `quoteLiteral()` on it once per contiguous
run, flushing only when a real field token or macro token is reached — so two adjacent unrecognized
words are quoted together as a single span, never producing back-to-back quote marks. Verified via
the regression test plus the full suite staying green.

### Testing-environment gotcha — React 19 `use()` + `<Suspense>` needs `await act()` around the initial `render()` in RTL/jsdom (Milestone 5)

**Finding:** `TemporalLocalizationProvider`'s tests (any component that suspends via `use()` on its
very first render) hung indefinitely — `screen.findByRole(...)` timed out with the fallback still
showing, and React logged "A component suspended inside an `act` scope, but the `act` call was not
awaited." Isolated with a throwaway probe component reduced to `use(Promise.resolve('hello'))`: even
a promise that's _already resolved_ by the time `render()` returns never triggered a re-render once
the fallback returned first. Not specific to this project's code — a general React 19 + `use()` +
`@testing-library/react` + jsdom interaction: React's own async re-render (once the suspended
promise settles) needs to happen inside a tracked `act()` call, and a bare `render()` outside one
doesn't provide that for a synchronously-first-suspending tree.
**Fix:** No source change — this only affects test code. Every test that renders a component
suspending via `use()` on mount wraps that initial `render()` call in
`await act(async () => { render(...) })` (`@testing-library/react`'s own `act`), which reliably
flushes the resolution. Documented inline in `test/components/TemporalLocalizationProvider*.test.tsx`
so a future test author reaching for `use()`-based Suspense elsewhere doesn't have to rediscover
this the same way.

### Coverage thresholds met (Milestone 5)

**Result:** `pnpm test:coverage` (`vitest run --project unit --project component --coverage`)
passes the plan's stated 85%-branch/90%-function gate with real margin: 88.19% branches, 100%
functions, 96.74% statements, 99.11% lines, across `src/**/*.{ts,tsx}`. `test/adapter/*.test.ts`
(pure `AdapterTemporal` method coverage, mirroring `AdapterLuxon`'s own method inventory),
`test/components/*.test.tsx` (real `LocalizationProvider` + MUI X pickers + `AdapterTemporal`, incl.
calendar-grid week-start ordering verified both natively and under `forceWeekInfoFallback`), plus
targeted additions to close specific branch gaps (`createTemporalAdapter`'s factory-level default
locale layering, `getTemporal()`'s not-yet-available throw, `ensureWeekInfo()`'s already-loaded
early return, `getFirstDayOfWeek()`'s no-resolvable-region fallback, and every remaining
`formatByToken`/`parseByToken` token case). A handful of `tokenizeFormat.ts`'s `?? ''`
null-coalescing branches (added defensively to satisfy `noUncheckedIndexedAccess`, not because the
index can actually be out of range at those call sites) are provably unreachable at runtime and
stay uncovered — accepted as-is rather than restructuring working code to chase literal 100%; they
don't block the aggregate threshold.

### Real bug — `tsconfig.json`'s bare `.storybook` include entry silently checked nothing (Milestone 7)

**Finding:** `tsconfig.json`'s `include` array had `.storybook` listed as a bare directory name
(alongside `src`, `test`, `stories`, which all work fine that way) since Milestone 0. Once
`.storybook/*.ts(x)` files actually existed to test this, a deliberately-introduced type error in
`.storybook/main.ts` was **not** caught by `tsc --noEmit` — the directory was silently
contributing zero files to the program, `--noEmit` was "clean" only because nothing was being
checked, not because the files were correct. `eslint`'s type-aware rules independently surfaced
the same gap as a parser error ("file was not found in any of the provided project(s)") the moment
`.storybook/*.ts(x)` files existed for it to try to lint. Root cause: TypeScript's own
`include`-glob handling excludes dot-prefixed directories/files by default — true even for
`src`/`test`/`stories` in principle, but irrelevant for those since they don't start with a dot;
`.storybook` does, so the bare-directory-name shorthand (which works for non-dot directories)
silently failed to include it.
**Fix:** changed the `.storybook` entry to the explicit glob `.storybook/**/*` — TypeScript does
honor an explicit wildcard pattern for a dot-prefixed directory, even though it won't
auto-expand a bare dot-prefixed directory name the way it does for a plain one. Verified via the
same deliberate-error probe (now correctly caught) before and after.

### Storybook 10.5 wiring notes (Milestone 7)

- **`@storybook/addon-vitest`'s `setProjectAnnotations` pattern is now unnecessary.** `PLAN.md`
  called for a `.storybook/vitest.setup.ts` wiring `setProjectAnnotations(preview)` into the
  `storybook` Vitest project — the documented pattern for older `@storybook/addon-vitest`
  releases. Writing it anyway and running `pnpm test:storybook` surfaced this version's own
  runtime notice: "Since Storybook 10.3, `@storybook/addon-vitest` applies these automatically…
  You can safely remove the `setProjectAnnotations` call from your setup file, or remove the file
  entirely." Removed the file entirely (it had no other custom code) and dropped the `setupFiles`
  entry for the `storybook` Vitest project accordingly — `.storybook/preview.tsx`'s decorator
  (which wraps every story in `TemporalLocalizationProvider`/`<Suspense>`) is confirmed still
  applied to stories run under Vitest with the file gone, per the addon's own automatic behavior.
- **`vitest.config.ts`'s `storybook` project** follows `@storybook/addon-vitest`'s own bundled
  `vitest.config.4.template.ts` (matched to our installed Vitest 4.x) verbatim in shape:
  `storybookTest({ configDir: '.storybook' })` as a plugin, `browser: { enabled: true, headless:
true, provider: playwright(), instances: [{ browser: 'chromium' }] }`. Required a new
  `@vitest/browser-playwright` devDependency (distinct from the already-installed
  `@vitest/browser`) and a matching local Playwright Chromium binary
  (`pnpm exec playwright install chromium` — the previously-cached revision didn't match this
  project's pinned Playwright version). `pnpm test:storybook` runs every story as a real
  interaction test in an actual headless Chromium instance, not a visual-only smoke check —
  5 story files, 10 stories, all green.
- **Per-story force-flags without an extra per-story wrapper.** `LazyPolyfillEnvironment.stories.tsx`
  needs `forcePolyfill`/`forceWeekInfoFallback` set per-story, and `LocaleWeekStart.stories.tsx`
  needs an _interactively controllable_ locale (via Storybook's Controls panel). Solved two
  different ways deliberately: the former reads a `parameters.temporal` object (static per story,
  fine since force-flags are demo-only, not meant to be end-user-adjustable) via the global
  decorator in `preview.tsx`; the latter uses a small local, non-exported demo component whose
  `locale` is a genuine component **prop** (so Storybook's Controls can drive it live) wrapped in
  its own `TemporalLocalizationProvider`, nested inside the global decorator's own instance — a
  second, redundant provider layer, harmless here since it's demo-only code, not part of the
  published package.

### Real, genuine packaging bug found — `TemporalLocalizationProvider` bundled a second copy of MUI's `LocalizationProvider` (Milestone 8)

**Finding:** `vite.config.ts`'s `rollupOptions.external` listed package names as plain strings
(`'@mui/x-date-pickers'`, `'react'`, etc.) — but `TemporalLocalizationProvider.tsx`'s own source
imports from the _subpath_ `@mui/x-date-pickers/LocalizationProvider`, not the bare package name.
Rollup's `external` option does exact-string matching against the literal import specifier, so
that plain-string entry never matched this actual import at all — Rollup dutifully bundled MUI's
own `LocalizationProvider` component (and whatever it transitively pulled in, including
`AdapterDayjs`) straight into `dist/TemporalLocalizationProvider-*.js` (105KB, for what should
have been a ~1KB wrapper). This went completely undetected through every earlier milestone: every
test/story in this repo either imports `AdapterTemporal`/`createTemporalAdapter` directly (no
`LocalizationProvider` re-export at all) or resolves `TemporalLocalizationProvider` straight from
`src/` via Vite's dev-server module graph (Storybook, the `component` Vitest project) — never
through Rollup's production bundler, so the bug had no way to surface until something actually
consumed the _built_ `dist/` output through a real external app.

**Symptom, once actually installed and rendered in a real consumer app:** MUI X error #149,
verbatim: _"Can not find the date and time pickers localization context... This can also happen
if you are bundling multiple versions of the `@mui/x-date-pickers` package"_ — exactly what was
happening. A real consuming app's own `<DatePicker>` (using its own installed copy of
`@mui/x-date-pickers`) couldn't see the React Context provided by our bundled copy of
`LocalizationProvider`, since bundling created a second, separately-scoped instance of that
Context object.

**Fix:** changed `external` from plain strings to regexes matching the package name _and_ any
subpath (`/^@mui\/x-date-pickers/`, `/^@mui\/material/`, `/^@emotion\/react/`,
`/^@emotion\/styled/`, `/^react-dom/`, plus exact-match `/^react$/`/`/^react\/jsx-runtime$/`).
Rebuilt: the same chunk dropped from 105798 bytes to 743 bytes and now correctly `import`s
`@mui/x-date-pickers/LocalizationProvider` rather than bundling it.
**Verification (this is the actual Milestone 8 packaging smoke test):** `pnpm pack`, installed the
tarball into a scratch Vite + React + TypeScript app (built fresh via `pnpm create vite`, real
`@mui/x-date-pickers`/`@mui/material`/`@emotion/*` deps installed normally, not linked from this
repo), and drove it with Playwright against a real, current Chromium (151.0.7922.34 — confirmed to
have native `Temporal` support, so this genuinely exercises the native path, not just the
polyfill). Confirmed, in that real external app: `createTemporalAdapter`'s subpath default-export
import and the root-barrel named-export import resolve to the exact same function
(`Object.is`-equal); a `DatePicker` built manually via `createTemporalAdapter()` +
`LocalizationProvider` renders and holds a real value; `TemporalLocalizationProvider` renders a
working `DatePicker` both with native support and with `forcePolyfill` forced on; a `DateCalendar`
under `TemporalLocalizationProvider` with `forceWeekInfoFallback` forced on and `adapterLocale="fr-FR"`
renders with genuinely correct Monday-first French weekday headers (`L,M,M,J,V,S,D`); and the
`tsc -b` step of that consumer app's own build (using its own tsconfig referencing our shipped
`.d.ts` files) type-checks cleanly. Zero console/page errors in the final run. This is exactly the
class of bug (subpath-vs-bare-name external mismatch) this manual step exists to catch — no
automated test in this repo runs through Rollup's actual bundling of `dist/`.

### Real bug — Docs sidebar wasn't actually sorted by the numbered titles (user-reported, post-Milestone 7)

**Finding:** the 8 `stories/docs/*.mdx` pages were each titled with a leading number
(`'Docs/1. Introduction'` … `'Docs/8. Glossary'`) specifically so they'd read in order in the
Storybook sidebar — but the user reported (with a screenshot) that the rendered sidebar showed
them in an arbitrary order (`2, 8, 6, 1, 4, 5, 7, 3`), not sequential. Root cause: Storybook's
actual default `storySort` method is `'configure'` (roughly, file-discovery/import order), _not_
alphabetical-by-title as might be assumed — the numbered titles alone were never sufficient to
produce a sorted sidebar.
**Fix:** set `parameters.options.storySort = { method: 'alphabetical' }` in `.storybook/preview.tsx`.
Sorting alphabetically by title string correctly orders the single-digit `1.`–`8.` prefixes (no
"10 before 2" lexicographic gotcha to worry about at this count). Verified against the real
rendered sidebar DOM (not just the build output) via Playwright against a served
`storybook-static` build — the 8 Docs entries now render in the DOM in the order 1 through 8.

### Picker stories rewritten as controlled components (user-directed, post-Milestone 7)

**Request:** all three main picker stories (`DatePicker`/`TimePicker`/`DateTimePicker`) should
show `value` as a genuinely controlled, live `Temporal` value, in both the rendered example and
the "Show code" panel.
**Implementation:** each story's `Default`/variant now uses `render: () => <NamedDemo />` backing
a small **named** local component (`DefaultDemo`, `WithMinAndMaxDateDemo`, etc.) — not an inline
arrow function — specifically so `react-hooks/rules-of-hooks` (and React itself) recognize the
`useState` call inside it as belonging to a real component; an anonymous `render: () => { useState...
}` arrow assigned as an object property doesn't read as a component by the lint rule's naming
heuristic and gets flagged. Each demo component holds `value` in real `useState(() =>
Temporal.Now.zonedDateTimeISO(...))` state, passes `value`/`onChange` to the real MUI picker, and
renders the current value as visible text below the field, so the live example genuinely
demonstrates real-time Temporal state, not just a static example.
**"Show code" panel:** by default, Storybook's docs page synthesizes source code from a story's
`args` for `component`+`args`-only stories — but these stories use a custom `render` instead
(needed for the controlled-component pattern above), and relying on automatic source extraction
from an arbitrary `render` function's structure was judged too fragile/uncertain to guarantee the
panel shows exactly the intended idiomatic snippet. Set `parameters.docs.source.code` explicitly
per story instead — `@storybook/addon-docs/blocks`'s own `Source` block documents this exact
option ("Use this to override the content of the source block"). Verified directly: built
`storybook-static`, served it, clicked each story's real "Show code" toggle via Playwright, and
confirmed the rendered panel text contains the intended `useState`/`Temporal.Now.zonedDateTimeISO`
snippet verbatim — not just that the parameter was set in source.
**Follow-up (user-directed):** `WithMinAndMaxDate`'s original range (`minDate`/`maxDate` spanning
all of 2026) was too broad to actually _see_ — the popup opens on today's month, nowhere near
either boundary, so the restriction wasn't visually apparent without navigating many months.
Narrowed to a range inside a single month (`2026-03-05`–`2026-03-25`) with a fixed starting
`value` (`2026-03-15`, not "now") that already falls inside it, so the calendar popup opens
already showing disabled days at both ends in the very first view. Verified directly via
Playwright against the real rendered popup: opens on "March 2026" with days 1–4 and 26–31 disabled
and 5–25 enabled, no navigation needed.

## Open spikes (to be resolved during implementation, logged here once settled)

### npm Trusted Publisher first-publish sequencing — RESOLVED (Milestone 9)

**Finding:** confirmed via npm's own docs (docs.npmjs.com/trusted-publishers) that the Trusted
Publisher settings only exist on a package's settings page on npmjs.com, which only exists once
the package has been published at least once — there is no way to pre-register OIDC trust for a
name that isn't on the registry yet (unlike PyPI's equivalent flow). `@cxing/mui-temporal-adapter`
404s on the registry as of this writing, so a one-time manual publish is unavoidable.

**Decision:** the user runs one manual `npm publish --access public` from their own `npm login`
session, at a deliberately-low throwaway version (e.g. `0.0.1`) that is **never git-tagged** —
semantic-release only ever looks at git tags to decide "was there a previous release," never the
npm registry itself, so this placeholder stays invisible to it. Only after that placeholder exists
can the user configure the npm Trusted Publisher (GitHub owner `cutterbl`, repo
`mui-temporal-adapter`, workflow filename `release.yml`, "npm publish" allowed, no environment).

### First published version: `1.0.0`, not `0.1.0` — RESOLVED (Milestone 9)

**Finding:** semantic-release does not read `package.json`'s `version` field at all — it computes
the next version purely from git tags. With no prior tag, its first release is **hard-coded to
`1.0.0`**, a deliberate, documented project stance (0.x-range support is explicitly out of scope
per semantic-release's own maintainers — see
[discussion #3240](https://github.com/semantic-release/semantic-release/discussions/3240) and
[issue #268](https://github.com/semantic-release/semantic-release/issues/268)); there is no
supported config option to start below `1.0.0` without forking the tool. `package.json`'s current
`"0.1.0"` is scaffold only — `@semantic-release/npm` overwrites it at release time regardless.
**Decision:** confirmed via direct question — accept `1.0.0` as the real first automated release
rather than hand-rolling a version override. Kept the ordering clean: `release.yml` is deliberately
held out of the `feat/initial-implementation` → `main` merge (see below) so that merge can't
prematurely fire a release before the npm-side manual setup above is complete; it's added in a
small follow-up commit once that setup is done, and _that_ push is what actually produces the
real `1.0.0` release, npm publish, and Pages deploy — the "one push does everything" moment the
user asked for.

**Also corrected:** the original plan assumed GitHub Pages source and branch protection on `main`
were manual, UI-only steps. Re-checked: `gh` is already authenticated as the repo owner
(`cutterbl`) with `repo`+`workflow` scopes, which is sufficient to set both via `gh api` directly —
only the npm-side steps above are genuinely credential-gated and manual.

### Pages custom domain: `cutterscrossing.com`, not `cutterbl.github.io` (Milestone 9)

**Finding:** enabling Pages via `gh api repos/.../pages` (`build_type: workflow`) came back with
`html_url: "http://cutterscrossing.com/mui-temporal-adapter/"`, not the `cutterbl.github.io` URL
`README.md` had documented since Milestone 8 — the account has a custom domain attached, inherited
by this repo's Pages site, initially serving over plain HTTP (`https_enforced: false`).
**Decision:** confirmed via direct question — keep the custom domain (intentional), rather than
clearing it back to the default `github.io` URL. Enabled `https_enforced: true` via the same API
(the domain's certificate was already `approved`, so this took effect immediately — site now
resolves at `https://cutterscrossing.com/mui-temporal-adapter/`); updated all four
`cutterbl.github.io` references in `README.md` to match. No Storybook/Vite build config changes
needed — the repo subpath (`/mui-temporal-adapter/`) is unchanged, only the domain differs, and
the static build already uses relative asset paths.

### Manual npm placeholder publish: `--provenance=false` override required (Milestone 9)

**Finding:** `npm publish --access public` for the throwaway placeholder failed outright —
`EUSAGE ... Automatic provenance generation not supported for provider: null` —
because `package.json`'s `publishConfig.provenance: true` (set for the real automated release)
tries to generate provenance unconditionally, and provenance can only be generated from a
supported CI provider (GitHub Actions, GitLab CI); there's no CI context on a local machine.
**Fix:** `npm publish --access public --provenance=false` for this one manual invocation only —
overrides `publishConfig` for that single command without editing `package.json`.
`release.yml`'s real publish runs inside GitHub Actions, where provenance generates normally.

### `release.yml`: npm CLI version + git identity (Milestone 9)

Two details needed beyond the plan's original sketch, both added to `release.yml`:

- **npm CLI >= 11.5.1 required for OIDC/Trusted Publishing** (confirmed via search) — not
  guaranteed to be whatever ships with the `node@24` runtime image, so an explicit
  `npm install -g npm@latest` step runs before `pnpm run release`.
- **Git identity for the `@semantic-release/git` commit-back** — `@semantic-release/git` doesn't
  set `user.name`/`user.email` itself; a step sets both explicitly to `github-actions[bot]`
  (GitHub's own recognized bot identity) before the release step runs, to avoid a bare git
  "Author identity unknown" failure on the changelog/version commit-back to `main`.

### npm 2FA publishing-access setting: strictest option confirmed compatible with OIDC

**Finding:** npm's package "Publishing access" setting offers "Require two-factor authentication
and disallow bypass 2FA tokens" (the strictest option) — confirmed via npm's own docs this does
**not** affect Trusted Publisher/OIDC auth, only classic long-lived token publishing; OIDC tokens
are short-lived and workflow-specific, not a "bypass 2FA" token in the sense that setting targets.
npm's own docs recommend pairing Trusted Publishers with this strictest setting.
**Decision:** enabled it on the package (user's choice, confirmed via direct question) — no impact
on `release.yml`'s ability to publish going forward; only affects any _future_ manual
`npm publish` from a terminal, which would now require 2FA each time (expected/desired).

### Real bug found — first `release.yml` run failed: required status checks can never be

### satisfied by a direct push (Milestone 9)

**Symptom:** the very first automated release run got all the way through
`@semantic-release/npm`'s `prepare` step (correctly computed `1.0.0`, wrote it to
`package.json`, generated `CHANGELOG.md`) and then failed at `@semantic-release/git`'s `prepare`
step: `git push --tags HEAD:main` was rejected —
`GH006: Protected branch update failed ... 2 of 2 required status checks are expected`. Nothing
landed anywhere (semantic-release aborts the whole pipeline before the `publish` step once any
`prepare` step fails) — confirmed `main` and the npm registry were both untouched.

**Root cause:** required-status-checks-before-push is structurally incompatible with a brand-new
commit pushed directly — the check literally cannot have run against a SHA that doesn't exist
upstream yet; the feature is built around PR merges (where the checked SHA is what lands), not
direct pushes. `enforce_admins: false` didn't help either: the pusher is the `github-actions[bot]`
identity via the default `GITHUB_TOKEN`, which isn't a human/admin-role account and so doesn't
inherit that exemption regardless of the toggle.

**First approach tried and rejected:** migrating from classic branch protection to a GitHub
Ruleset with a `bypass_actors` entry for the built-in "GitHub Actions" app (id `15368`, confirmed
via `gh api apps/github-actions`) — the API rejected it: `"Actor GitHub Actions integration must
be part of the ruleset source or owner organization"`. Researched further: Ruleset bypass via a
GitHub App only works for a genuinely separate custom App with its own installation/private key
(confirmed via a real-world example fix), not the built-in Actions identity backing the default
token — for a personal (non-org) repo especially, this would mean _more_ stored-credential
overhead (a whole App + private key secret), not less. Reverted cleanly back to classic branch
protection (nothing was actually created before the rejection, so no cleanup needed beyond
re-creating the classic rule, which had been deleted to attempt the migration).

**Actual fix:** a fine-grained PAT (`Contents: read/write` only, scoped to just this repo)
belonging to the repo owner, stored as the `RELEASE_GITHUB_TOKEN` secret, used **only** as
`release.yml`'s checkout step's `token:` input — this makes the one `git push` that needs to land
past branch protection authenticate as an actual admin-role account (which `enforce_admins: false`
does exempt), matching how a human's own local push already succeeds. Everything else (the `npm
publish` via OIDC, the GitHub Release/tag via `@semantic-release/github`) is untouched and still
uses the auto-issued, scoped, short-lived default `GITHUB_TOKEN` — this is the minimum-privilege
fix, not a wholesale switch to PAT-based auth. This is also a well-precedented pattern, not a
one-off workaround: virtually every real-world "semantic-release publishing to a protected
default branch" setup needs exactly this, since it's a structural gap in GitHub's required-status-
checks feature, not something specific to this repo's configuration.

### Real bug found — second `release.yml` run: `npm publish` failed with a misleading

### `ENEEDAUTH` despite OIDC trust being valid, and left a premature `v1.0.0` tag (Milestone 9)

**Symptom:** with the PAT fix above in place, the run got much further — `@semantic-release/npm`'s
own preflight logged `Verifying OIDC context for publishing from GitHub Actions` immediately
followed by `OIDC token exchange with the npm registry succeeded`, and the `@semantic-release/git`
push succeeded this time (commit `chore(release): 1.0.0 [skip ci]` landed on `main`, along with
`CHANGELOG.md` and a pushed `v1.0.0` git tag — semantic-release core creates and pushes the tag
right after the `prepare` phase, _before_ the `publish` phase's actual `npm publish` runs). Then
the real `npm publish` subprocess failed outright: `npm error code ENEEDAUTH`.

**Root cause:** confirmed via research (npm/cli#9088) this is a known, actively-tracked npm CLI
diagnostics gap — `ENEEDAUTH`/`404` are npm's generic fallback errors for _any_ trusted-publishing
failure, actively misleading users toward the wrong fix (package naming, manual login) instead of
the real issue. The documented common cause, matching our case exactly: an npm CLI version too old
to support OIDC (needs >= 11.5.1) actually being what's invoked for the real `npm publish`
subprocess, even after an `npm install -g npm@latest` step — the upgrade itself succeeds, but nothing
guarantees the _new_ binary is what later steps resolve via `PATH`, and `@semantic-release/npm`'s
own preflight OIDC check apparently doesn't shell out through the same resolution path (it can
succeed independently of what the later real `npm publish` subprocess actually finds on `PATH`).

**Compounding issue found:** since the git tag `v1.0.0` was already pushed before the failure, a
naive retry would have looked at git history, found `v1.0.0` already exists, concluded the release
was already complete, and silently no-op'd forever — never actually retrying the `npm publish`.
**Recovery performed:** confirmed via `npm view ... versions` that the registry still only had the
placeholder `0.0.1` (so nothing to unpublish), then deleted the tag both remotely
(`git push --delete origin v1.0.0`) and locally before the retry. Deliberately left the already-
landed `chore(release): 1.0.0 [skip ci]` commit (package.json bump + CHANGELOG.md) on `main` as-is
— it's exactly what the next successful run needs to converge back to anyway.

**Fix:** `release.yml`'s npm-upgrade step now explicitly prepends the freshly-installed npm's real
global bin directory to `GITHUB_PATH`, plus a following diagnostic step that prints exactly what
`npm --version`/`command -v npm` resolve to in a _later_ step's shell (GITHUB_PATH edits don't
affect the step that wrote them, only subsequent ones) — provable evidence either way instead of
another guess. **If this repeats:** check `main`/the registry/existing tags exactly as done here
before any retry, every time — a partially-completed run leaving a stray tag is a structural
possibility any time `@semantic-release/git`'s push succeeds but a later plugin step fails.
