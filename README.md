# @cxing/mui-temporal-adapter

[![npm version](https://img.shields.io/npm/v/@cxing/mui-temporal-adapter.svg)](https://www.npmjs.com/package/@cxing/mui-temporal-adapter)
[![license: MIT](https://img.shields.io/npm/l/@cxing/mui-temporal-adapter.svg)](./LICENSE)

A [`dateAdapter`](https://mui.com/x/react-date-pickers/adapters-locale/) for
[`@mui/x-date-pickers`](https://mui.com/x/react-date-pickers/) backed directly by the TC39
[Temporal API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) —
JavaScript's own built-in replacement for `Date` — instead of a third-party date library. If a
visitor's browser doesn't have Temporal built in yet, this package transparently and lazily
loads a small polyfill for them, so you don't have to think about browser support yourself.

**New to this package or to Temporal?** The full guide — written for beginners, no prior
Temporal experience assumed — lives in this package's
[Storybook documentation site](https://cutterscrossing.com/mui-temporal-adapter/). This README
stays closer to a standard reference; start there instead if you want the walkthrough.

## Install

```sh
npm install @cxing/mui-temporal-adapter
```

You'll also need `@mui/x-date-pickers`, `@mui/material`, `react`, and `react-dom` already
installed — the same things any other MUI X date adapter needs.

> **ESM only.** This package is published as native ES modules — there's no CommonJS
> (`require()`-compatible) build. If your project already uses `import`/`export` syntax (true
> of most current React setups — Vite, Next.js, Create React App, and friends), you don't need
> to do anything differently. A CommonJS-only project (e.g. an old `require()`-based Node
> script, or a Jest config not set up for ESM) can't `require()` this package directly.

## Quick start

Because Temporal isn't universally available in every browser yet, this package needs one
brief asynchronous setup step before your pickers can render — it checks what the visitor's
browser supports, and lazily loads a polyfill if needed. See
[Why is setup asynchronous?](#why-is-setup-asynchronous) below for the full reasoning. Two
equivalent ways to handle it:

### Option A — `TemporalLocalizationProvider` + `Suspense`

The simplest option for most apps — wrap your pickers in `TemporalLocalizationProvider`, itself
wrapped in a React `<Suspense>` boundary:

```tsx
import { Suspense } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TemporalLocalizationProvider from '@cxing/mui-temporal-adapter/TemporalLocalizationProvider';

function App() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <TemporalLocalizationProvider>
        <DatePicker label="Pick a date" />
      </TemporalLocalizationProvider>
    </Suspense>
  );
}
```

### Option B — `createTemporalAdapter()` once, at startup

If you'd rather resolve the adapter once up front (e.g. before your first `render()` call),
`await` the factory directly and hand the result to MUI's own `LocalizationProvider`:

```tsx
import { createRoot } from 'react-dom/client';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import createTemporalAdapter from '@cxing/mui-temporal-adapter/createTemporalAdapter';

const AdapterTemporal = await createTemporalAdapter();

createRoot(document.getElementById('root')!).render(
  <LocalizationProvider dateAdapter={AdapterTemporal}>
    <DatePicker label="Pick a date" />
  </LocalizationProvider>,
);
```

Every subpath import above also has an equivalent named export from the package root, if you'd
rather import everything from one place:

```ts
import { createTemporalAdapter, TemporalLocalizationProvider } from '@cxing/mui-temporal-adapter';
```

Once wrapped, every MUI X picker component works with no further per-component setup —
`DatePicker`, `DateField`, `DateCalendar`, `TimePicker`, `TimeField`, `DateTimePicker`,
`DateTimeField` — and every value they produce or accept is a `Temporal.ZonedDateTime`, the one
Temporal type that carries a date, a time, and a time zone together.

```tsx
import { useState } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const [value, setValue] = useState(Temporal.Now.zonedDateTimeISO('America/New_York'));

<DateTimePicker
  value={value}
  onChange={setValue}
  timezone="America/Los_Angeles"
  minDate={Temporal.PlainDate.from('2026-01-01').toZonedDateTime('America/Los_Angeles')}
/>;
```

Reference the ambient `Temporal` global directly, exactly as
[MDN documents it](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) —
no import from this package needed. That only works _after_ the setup step above has resolved,
though; see [Troubleshooting](https://cutterscrossing.com/mui-temporal-adapter/?path=/docs/docs-7-troubleshooting--docs)
in the full docs if you reach for `Temporal.*` too early and hit a `ReferenceError`.

## Why is setup asynchronous?

MUI's `LocalizationProvider` constructs its adapter **synchronously** internally
(`new DateAdapter(...)`) — it can never `await` anything itself. So `createTemporalAdapter()`
does all the async work up front (feature-detecting native Temporal support and locale
first-day-of-week support, lazily loading a polyfill for either if the browser lacks it) and
resolves to the `AdapterTemporal` **class itself**, not an instance. `LocalizationProvider`
then constructs it synchronously, exactly as it expects to, with every one of its methods able
to run synchronously from that point on. `TemporalLocalizationProvider` is a thin convenience
wrapper around this same factory, built on React 19's `use()` hook — the standard mechanism for
"await a resource, then render."

## Browser & runtime support

Temporal itself, and the newer `Intl.Locale.prototype.getWeekInfo()` API this package uses for
locale-aware first-day-of-week, are each still in the process of rolling out across engines.
This package transparently polyfills either one when it's missing — you never need to check
support yourself, and evergreen environments that already have both pay zero extra bytes for
the polyfills, since they're only fetched when actually needed.

| Engine                   | Native `Temporal`                                                        | Native `Intl.Locale#getWeekInfo()` |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------- |
| Chrome / Edge (Chromium) | Yes (Chrome 144+)                                                        | Yes                                |
| Node.js                  | Yes (Node 26+)                                                           | Yes                                |
| Firefox                  | Rolling out — check [caniuse.com/temporal](https://caniuse.com/temporal) | Yes                                |
| Safari                   | Rolling out — check [caniuse.com/temporal](https://caniuse.com/temporal) | Yes                                |

Whichever cells say "rolling out" above, this package's polyfill fallback covers them
transparently — see
[How the Fallbacks Work](https://cutterscrossing.com/mui-temporal-adapter/?path=/docs/docs-6-how-the-fallbacks-work--docs)
in the full docs for exactly how.

### TypeScript

`Temporal.*` type-checking in your own app code comes from TypeScript's own bundled library
files, not from this package — you'll need a TypeScript version whose bundled `lib` already
includes Temporal's ambient global types (this package's own `AdapterTemporal.ts` module
augmentation registers `Temporal.ZonedDateTime` as the concrete `PickerValidDate` type
throughout `@mui/x-date-pickers` the moment you import anything from this package).

## API reference

| Export                            | Subpath                                                    | What it is                                                                                                         |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `createTemporalAdapter(options?)` | `@cxing/mui-temporal-adapter/createTemporalAdapter`        | `async` factory; resolves to the `AdapterTemporal` class, ready for `LocalizationProvider`'s `dateAdapter` prop.   |
| `AdapterTemporal`                 | `@cxing/mui-temporal-adapter/AdapterTemporal`              | The adapter class itself. Don't construct it directly — get it from `createTemporalAdapter()`.                     |
| `TemporalLocalizationProvider`    | `@cxing/mui-temporal-adapter/TemporalLocalizationProvider` | Convenience component: `createTemporalAdapter()` + `LocalizationProvider` combined, built on `use()`/`<Suspense>`. |

Every export also has full JSDoc on its type — hover it in your editor for the complete
parameter/return documentation, or see the
[full Storybook guide](https://cutterscrossing.com/mui-temporal-adapter/) for a walkthrough of
locales, time zones, and everything else.

## License

[MIT](./LICENSE) © Steve "Cutter" Blades
