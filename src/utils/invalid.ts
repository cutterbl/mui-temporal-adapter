import { getTemporal } from '../temporal-runtime/getTemporal';

/**
 * A fixed, deliberately-out-of-normal-range epoch millisecond value used as the
 * `AdapterTemporal.getInvalidDate()` sentinel.
 *
 * Temporal, unlike some date libraries (Luxon in particular), has no first-class
 * "invalid date" value — any `Temporal.ZonedDateTime` that was successfully
 * constructed is fully valid. So instead of an object that's *inherently* invalid,
 * `getInvalidDate()` returns a real, constructible value pinned to this exact,
 * recognizable instant, and `isValid()` treats that specific instant as the "invalid"
 * marker.
 *
 * The chosen instant is JavaScript's own `Date` type's minimum representable value
 * (`-8_640_000_000_000_000` ms, April 20, 271821 BCE) — comfortably inside Temporal's
 * much wider supported range, but so far outside any realistic picker value that it
 * can't collide with a genuine date a consumer created.
 */
export const INVALID_DATE_SENTINEL_EPOCH_MS = -8_640_000_000_000_000;

/**
 * Builds the `getInvalidDate()` sentinel value.
 * See {@link INVALID_DATE_SENTINEL_EPOCH_MS} for why this particular instant was chosen.
 *
 * @returns The sentinel `Temporal.ZonedDateTime`, always in the `'UTC'` zone.
 */
export function createInvalidDate(): Temporal.ZonedDateTime {
  return getTemporal()
    .Instant.fromEpochMilliseconds(INVALID_DATE_SENTINEL_EPOCH_MS)
    .toZonedDateTimeISO('UTC');
}

/**
 * Reports whether a value is a usable `Temporal.ZonedDateTime` — i.e. not `null` and
 * not the {@link createInvalidDate} sentinel.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a valid, usable date.
 */
export function isValidZonedDateTime(
  value: Temporal.ZonedDateTime | null,
): value is Temporal.ZonedDateTime {
  if (value === null) {
    return false;
  }
  return value.epochMilliseconds !== INVALID_DATE_SENTINEL_EPOCH_MS;
}
