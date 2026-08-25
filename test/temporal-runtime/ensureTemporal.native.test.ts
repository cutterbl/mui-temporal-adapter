import { afterEach, describe, expect, it } from 'vitest';
import { ensureTemporal } from '../../src/temporal-runtime/ensureTemporal';

/**
 * These tests simulate an environment where a `Temporal`-like global is
 * already present — proving `ensureTemporal()` leaves it alone (no
 * polyfill load) unless explicitly told to override it via `force`.
 */
describe('ensureTemporal — global already present', () => {
  const MARKER = { __marker: 'stand-in-for-native-temporal' };
  const originalTemporal = (globalThis as { Temporal?: unknown }).Temporal;

  afterEach(() => {
    (globalThis as { Temporal?: unknown }).Temporal = originalTemporal;
  });

  it('does nothing when a Temporal global is already present and force is not set', async () => {
    (globalThis as { Temporal?: unknown }).Temporal = MARKER;

    await ensureTemporal();

    // Still our exact stand-in object — nothing was imported or reassigned.
    expect((globalThis as { Temporal?: unknown }).Temporal).toBe(MARKER);
  });

  it('loads the polyfill even when a global is already present, when force is true', async () => {
    (globalThis as { Temporal?: unknown }).Temporal = MARKER;

    await ensureTemporal({ force: true });

    const installed = (globalThis as { Temporal?: unknown }).Temporal;
    expect(installed).not.toBe(MARKER);
    // A real, working Temporal implementation is now installed.
    expect(typeof (installed as typeof Temporal).Now.zonedDateTimeISO).toBe('function');
  });
});
