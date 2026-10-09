import { describe, expect, it } from 'vitest';
import { stitekZemePuvodu } from './zeme-puvodu';

describe('stitekZemePuvodu', () => {
  it('známou zemi vyskloňuje', () => {
    expect(stitekZemePuvodu('Itálie')).toBe('Vyrobeno v Itálii');
    expect(stitekZemePuvodu('Francie')).toBe('Vyrobeno ve Francii');
    expect(stitekZemePuvodu('Slovensko')).toBe('Vyrobeno na Slovensku');
  });

  it('nevadí mu chybějící diakritika, velikost písmen ani mezery', () => {
    expect(stitekZemePuvodu('  italie ')).toBe('Vyrobeno v Itálii');
    expect(stitekZemePuvodu('ČESKÁ   REPUBLIKA')).toBe('Vyrobeno v Česku');
  });

  it('neznámou zemi neskloňuje, jen ji uvede', () => {
    expect(stitekZemePuvodu('Albánie')).toBe('Původ: Albánie');
  });

  it('bez vyplněné země štítek nedá', () => {
    expect(stitekZemePuvodu(null)).toBeNull();
    expect(stitekZemePuvodu(undefined)).toBeNull();
    expect(stitekZemePuvodu('   ')).toBeNull();
  });
});
