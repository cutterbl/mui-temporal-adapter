import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { LocalizationProviderProps } from '@mui/x-date-pickers/LocalizationProvider';
import createTemporalAdapter from '../../../src/createTemporalAdapter';
import type {
  TemporalAdapterConstructor,
  TemporalAdapterOptions,
} from '../../../src/createTemporalAdapter';

/**
 * Shared helper for the `component` project: resolves a real `AdapterTemporal` class via the
 * same public `createTemporalAdapter()` entry point a consumer uses, then renders `ui` inside
 * a real `LocalizationProvider` wired to it — every component test in this directory renders
 * an actual MUI X picker component against an actual `AdapterTemporal`, never a mock.
 *
 * @param ui - The element to render, typically a picker component.
 * @param options - Forwarded to `createTemporalAdapter()` (e.g. `forcePolyfill`,
 *   `forceWeekInfoFallback`) plus any extra `LocalizationProvider` props (e.g.
 *   `adapterLocale`).
 * @returns The Testing Library `render()` result, plus the resolved `AdapterTemporal` class
 *   (handy for building fixture values with the exact same adapter the component under test
 *   is using).
 */
export async function renderWithAdapter(
  ui: ReactElement,
  options?: TemporalAdapterOptions &
    Omit<LocalizationProviderProps<string>, 'dateAdapter' | 'children'>,
) {
  const { forcePolyfill, forceWeekInfoFallback, locale, ...providerProps } = options ?? {};
  const AdapterTemporalClass: TemporalAdapterConstructor = await createTemporalAdapter({
    ...(forcePolyfill !== undefined && { forcePolyfill }),
    ...(forceWeekInfoFallback !== undefined && { forceWeekInfoFallback }),
    ...(locale !== undefined && { locale }),
  });

  const result = render(
    <LocalizationProvider dateAdapter={AdapterTemporalClass} {...providerProps}>
      {ui}
    </LocalizationProvider>,
  );

  return { ...result, AdapterTemporalClass };
}
