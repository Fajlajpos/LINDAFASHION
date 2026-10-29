import { describe, expect, it } from 'vitest';
import { nastaveniSchema } from './nastaveni';

describe('nastaveniSchema – ceny dopravy', () => {
  it('prázdné pole a null zůstanou „nevyplněno", ne nula', () => {
    // Nula by znamenala dopravce nabízeného za 0 Kč a dopravu zdarma
    // u každé objednávky – prázdné pole přitom slibuje „nenabízí se".
    const v = nastaveniSchema.parse({
      cenaDopravyZasilkovna: 79,
      cenaDopravyPPL: '',
      cenaDopravyCeskaPosta: null,
      prahDopravaZdarma: '',
    });

    expect(v.cenaDopravyZasilkovna).toBe(79);
    expect(v.cenaDopravyPPL).toBeNull();
    expect(v.cenaDopravyCeskaPosta).toBeNull();
    expect(v.prahDopravaZdarma).toBeNull();
  });

  it('vyplněnou nulu a číslo v textu přijme jako číslo', () => {
    const v = nastaveniSchema.parse({ cenaDopravyZasilkovna: '0', prahDopravaZdarma: '1500' });

    expect(v.cenaDopravyZasilkovna).toBe(0);
    expect(v.prahDopravaZdarma).toBe(1500);
  });
});
