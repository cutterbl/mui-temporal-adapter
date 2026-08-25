import { describe, expect, it } from 'vitest';
import { ensureTemporal } from '../../src/temporal-runtime/ensureTemporal';

/**
 * These tests simulate an environment with no `Temporal` global at all —
 * proving `ensureTemporal()` lazily installs a real, working polyfill onto
 * `globalThis.Temporal`, and that doing so again afterwards is a safe
 * no-op. Deleting the global (rather than relying on the host actually
 * lacking native support) keeps this deterministic even once this suite
 * eventually runs on a Node/browser version that does ship Temporal
 * natively.
 */
describe('ensureTemporal — no global present', () => {
  it('lazily installs a working polyfill, and is a safe no-op on a second call', async () => {
    delete (globalThis as { Temporal?: typeof Temporal }).Temporal;
    expect(typeof globalThis.Temporal).toBe('undefined');

    await ensureTemporal();

    expect(typeof globalThis.Temporal).not.toBe('undefined');
    expect(typeof globalThis.Temporal.Now.zonedDateTimeISO).toBe('function');

    // And it's genuinely usable, not just present:
    const today = globalThis.Temporal.PlainDate.from('2026-01-01');
    expect(today.year).toBe(2026);
    expect(today.month).toBe(1);
    expect(today.day).toBe(1);

    // Calling again — without resetting anything — must be a no-op: same
    // reference, nothing reloaded or reinstalled.
    const installedBefore = globalThis.Temporal;
    await ensureTemporal();
    expect(globalThis.Temporal).toBe(installedBefore);
  });
});
