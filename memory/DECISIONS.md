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

### 2. Async factory (`createTemporalAdapter()`) resolving to the adapter *class*
**Decision:** Public entry point is `async function createTemporalAdapter(): Promise<AdapterTemporalConstructor>`.
Consumers `await` it once, then hand the resolved class to `LocalizationProvider`'s `dateAdapter` prop.
**Why:** MUI's `LocalizationProvider` types `dateAdapter` as `new (...args) => MuiPickersAdapter` and
calls `new DateAdapter(...)` synchronously internally — it can never `await` anything. Resolving to
the *class itself* (not an instance) is what makes an async bootstrap compatible with that
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
**Rejected alternative:** `@mui/x-date-pickers`'s own convention actually uses *named* exports even
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
**Not affected:** `@semantic-release/npm` still publishes to the npm *registry* via the npm CLI
internally regardless of pnpm being the local package manager — that's an implementation detail of
the semantic-release plugin, not something the project needs to configure around. npm Trusted
Publisher / OIDC setup on npmjs.com is likewise unaffected — it governs registry publish auth, not
local tooling.

### 15. `./memory/` progress-tracking system, committed to the repo
**Decision:** `PLAN.md`, `DECISIONS.md` (this file), and `PROGRESS.md` live in the repo at
`./memory/`, created as the first action of Milestone 0, and are *not* gitignored.
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
installing if that's truthy — it treats *any* pre-existing `globalThis.Temporal` as "native,"
not just a genuine engine intrinsic. So the original design (re-`import()` the same specifier
to force a reinstall over an already-present global) silently no-ops: the import resolves to a
module that, even freshly evaluated, still sees the existing value and refuses to overwrite it.
**Decision:** `ensureTemporal({ force: true })` now explicitly `delete`s
`globalThis.Temporal` before importing, so the polyfill's own native-check genuinely sees
`undefined` and installs. This is also what makes `force`/`forcePolyfill` actually useful for the
`LazyPolyfillEnvironment` Storybook story later (Milestone 7) — without this fix, forcing the
polyfill path in a browser that *does* have native Temporal wouldn't have worked either.
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

## Open spikes (to be resolved during implementation, logged here once settled)
- **`getInvalidDate()` sentinel design** (Milestone 3): Temporal has no first-class "invalid" value
  (unlike Luxon's `DateTime.invalid(...)`) — need a concrete fixed sentinel value plus a
  try/catch-based `isValid()`. — **UNRESOLVED**
- **`vite-plugin-dts` multi-entry `.d.ts` emission shape** (Milestone 4): exact per-entry
  declaration output configuration (flat `dist/<EntryName>.d.ts` files matching the JS `fileName`
  map) depends on the installed `vite-plugin-dts` version's multi-entry support — needs a build
  spike to confirm the right plugin options. — **UNRESOLVED**
- **npm Trusted Publisher first-publish sequencing** (Milestone 9): confirm whether npm's OIDC
  trusted-publishing flow now supports establishing trust before a package's first publish, or
  whether one manual `npm publish --access public` is still required first. — **UNRESOLVED**
