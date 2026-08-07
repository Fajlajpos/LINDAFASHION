import { describe, expect, it } from 'vitest';
import { unikatniSlug, vytvoritSlug } from './slug';

describe('vytvoritSlug', () => {
  it('odstraní diakritiku, ne písmena pod ní', () => {
    // Regrese: dřívější verze regulárního výrazu ubírala i základní znak,
    // takže z "Testovací šaty" vzniklo "testovac-aty".
    expect(vytvoritSlug('Testovací šaty Verifikace')).toBe('testovaci-saty-verifikace');
    expect(vytvoritSlug('Žluťoučký kůň')).toBe('zlutoucky-kun');
    expect(vytvoritSlug('Hedvábné šaty Bellissima')).toBe('hedvabne-saty-bellissima');
  });

  it('spojí oddělovače do jedné pomlčky a ořízne kraje', () => {
    expect(vytvoritSlug('  Saka & Kabáty  ')).toBe('saka-kabaty');
    expect(vytvoritSlug('Halenky / Košile')).toBe('halenky-kosile');
  });

  it('zvládne text bez použitelných znaků', () => {
    expect(vytvoritSlug('!!!')).toBe('');
  });

  it('nepřeroste rozumnou délku', () => {
    expect(vytvoritSlug('a'.repeat(200)).length).toBeLessThanOrEqual(90);
  });
});

describe('unikatniSlug', () => {
  it('vrátí základ, když je volný', async () => {
    const slug = await unikatniSlug('Nové šaty', async () => false);
    expect(slug).toBe('nove-saty');
  });

  it('přidá příponu, dokud je obsazeno', async () => {
    const obsazene = new Set(['nove-saty', 'nove-saty-2']);
    const slug = await unikatniSlug('Nové šaty', async (k) => obsazene.has(k));
    expect(slug).toBe('nove-saty-3');
  });

  it('prázdnému názvu dá náhradní základ', async () => {
    const slug = await unikatniSlug('###', async () => false);
    expect(slug).toBe('polozka');
  });
});
