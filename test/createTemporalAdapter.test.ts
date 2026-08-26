import { describe, expect, it } from 'vitest';
import createTemporalAdapter from '../src/createTemporalAdapter';

describe('createTemporalAdapter — factory-level default locale', () => {
  it('with no `locale` option, resolves the plain AdapterTemporal class (runtime-default locale)', async () => {
    const AdapterTemporalClass = await createTemporalAdapter();
    const adapter = new AdapterTemporalClass();
    expect(adapter.getCurrentLocaleCode()).toBe(Intl.DateTimeFormat().resolvedOptions().locale);
  });

  it('with a `locale` option, every instance defaults to it when none is given at construction', async () => {
    const AdapterTemporalClass = await createTemporalAdapter({ locale: 'de-DE' });
    const adapter = new AdapterTemporalClass();
    expect(adapter.getCurrentLocaleCode()).toBe('de-DE');
  });

  it('an explicit `locale` at construction time still wins over the factory-level default', async () => {
    const AdapterTemporalClass = await createTemporalAdapter({ locale: 'de-DE' });
    const adapter = new AdapterTemporalClass({ locale: 'ja-JP' });
    expect(adapter.getCurrentLocaleCode()).toBe('ja-JP');
  });
});
