import type { PickersTimezone } from '@mui/x-date-pickers/models';
import { getTemporal } from '../temporal-runtime/getTemporal';

/**
 * Resolves a picker `timezone` prop value (`'default'`, `'system'`, `'UTC'`, or an
 * IANA zone name) down to a concrete zone identifier that Temporal's own APIs accept.
 *
 * `'default'` and `'system'` both resolve to the runtime's current time zone
 * (`Temporal.Now.timeZoneId()`). Unlike some date libraries, `Temporal.ZonedDateTime`
 * has no separate "this was deliberately the system zone" marker on its values — every
 * zone it carries is just a concrete IANA identifier — so there is no way to keep
 * `'default'` and `'system'` distinct once a value has been built. See `AdapterTemporal`'s
 * `getTimezone()` for the other half of this: it always reports the concrete zone id, not
 * the literal string `'system'`.
 *
 * @param timezone - The picker timezone value to resolve.
 * @returns A concrete IANA time zone identifier, or `'UTC'`.
 * @example
 * ```ts
 * resolveZone('UTC'); // 'UTC'
 * resolveZone('system'); // e.g. 'America/New_York', whatever the runtime's zone is
 * resolveZone('America/Los_Angeles'); // 'America/Los_Angeles', unchanged
 * ```
 */
export function resolveZone(timezone: PickersTimezone): string {
  switch (timezone) {
    case 'UTC':
      return 'UTC';
    case 'default':
    case 'system':
      return getTemporal().Now.timeZoneId();
    default:
      return timezone;
  }
}
