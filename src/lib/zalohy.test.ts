import { describe, it, expect } from 'vitest';
import { ZASTARALA_PO_HODINACH, stariHodin, type StavZaloh } from './zalohy';

const STAV: StavZaloh = {
  dokonceno: '2026-09-08T04:10:00Z',
  uspech: true,
  chyba: null,
  dbBajtu: 105821,
  souboryBajtu: 468173,
  drzetDnu: 30,
};

describe('stariHodin', () => {
  it('spočítá stáří v hodinách', () => {
    const ted = new Date('2026-09-08T10:10:00Z');
    expect(stariHodin(STAV, ted)).toBe(6);
  });

  it('čerstvá záloha je pod prahem zastarání', () => {
    const ted = new Date('2026-09-09T04:15:00Z'); // o den a pět minut později
    expect(stariHodin(STAV, ted)).toBeLessThan(ZASTARALA_PO_HODINACH);
  });

  /*
   * Práh je 36 hodin, ne 24, právě kvůli tomuhle případu: záloha běží jednou
   * denně, takže pár minut zpoždění nesmí vyvolat poplach. Kdyby se práh
   * snížil na 24, tenhle test spadne – a to je smysl, proč tu je.
   */
  it('zpožděná noční záloha ještě nehlásí poplach', () => {
    const ted = new Date('2026-09-09T08:00:00Z'); // 27,8 h
    expect(stariHodin(STAV, ted)).toBeLessThan(ZASTARALA_PO_HODINACH);
  });

  it('vynechaná noc už práh překročí', () => {
    const ted = new Date('2026-09-09T20:00:00Z'); // 39,8 h
    expect(stariHodin(STAV, ted)).toBeGreaterThan(ZASTARALA_PO_HODINACH);
  });

  /* Rozbité datum nesmí vyjít jako „čerstvá záloha“ – to by poplach utlumilo
     přesně ve chvíli, kdy je něco špatně. */
  it('nečitelné datum se počítá jako nekonečně staré', () => {
    expect(stariHodin({ ...STAV, dokonceno: 'nesmysl' })).toBe(Number.POSITIVE_INFINITY);
  });
});
