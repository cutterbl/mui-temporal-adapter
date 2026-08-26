import type { AdapterOptions } from '@mui/x-date-pickers/models';

// Registers `Temporal.ZonedDateTime` as the concrete type behind `PickerValidDate`
// throughout `@mui/x-date-pickers` — this is the standard module-augmentation hook
// every MUI X date adapter uses (see `AdapterLuxon`, `AdapterDayjs`, etc. for the same
// pattern with their own date type). It takes effect for any consumer app the moment
// it imports anything from this package, since TypeScript applies module augmentations
// project-wide once the declaring module is part of the compilation.
declare module '@mui/x-date-pickers/models' {
  interface PickerValidDateLookup {
    temporal: Temporal.ZonedDateTime;
  }
}

/**
 * Constructor options accepted by `AdapterTemporal`. Mirrors every other MUI X date
 * adapter's options shape (`{ locale, formats }`).
 *
 * There is no third "instance" option (unlike, say, `AdapterDayjs`, which can accept a
 * pre-configured `dayjs` instance with extra plugins loaded) — Temporal has no
 * per-instance configuration to inject. Once resolved, it's the plain ambient
 * `globalThis.Temporal`, the same for every `AdapterTemporal` instance in the app.
 */
export type AdapterTemporalOptions = AdapterOptions<string, never>;
