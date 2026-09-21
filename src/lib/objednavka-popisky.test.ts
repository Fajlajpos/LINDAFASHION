import { describe, expect, it } from 'vitest';
import { formatDatum, formatDatumCas } from './objednavka-popisky';

/**
 * Data se ukazují v české zóně, ať běží proces kdekoli.
 *
 * Na vývojovém počítači v Česku tenhle test projde i bez opravy – zóna
 * procesu je tam shodou okolností ta správná. Chyba se projeví až
 * v kontejneru, který `tzdata` nemá a běží v UTC: tam objednávka z půlnoci
 * spadla pod předchozí den a na přelomu měsíce do předchozího účetního
 * období. Test proto používá okamžik, který se v UTC a v Praze liší datem,
 * a hlídá výsledek, ne zónu stroje.
 */

/** 30. 9. 22:30 UTC = 1. 10. 00:30 SELČ. */
const PULNOC_NA_PRELOMU = new Date('2026-09-30T22:30:00Z');

describe('formatDatum', () => {
  it('bere datum podle Prahy, ne podle zóny procesu', () => {
    // Pojistka, že test měří to, co tvrdí: v UTC je to opravdu jiný den.
    expect(PULNOC_NA_PRELOMU.toLocaleDateString('cs-CZ', { timeZone: 'UTC' })).toBe('30. 9. 2026');

    expect(formatDatum(PULNOC_NA_PRELOMU)).toBe('1. 10. 2026');
  });

  it('počítá se zimním časem', () => {
    // 15. 1. 23:30 UTC = 16. 1. 00:30 SEČ (posun jen o hodinu).
    expect(formatDatum(new Date('2026-01-15T23:30:00Z'))).toBe('16. 1. 2026');
  });
});

describe('formatDatumCas', () => {
  it('ukazuje český čas, ne UTC', () => {
    const vysledek = formatDatumCas(PULNOC_NA_PRELOMU);
    expect(vysledek).toContain('1. 10. 2026');
    expect(vysledek).toContain('00:30');
  });
});
