/**
 * Kódy uplatněné v košíku, přenesené do pokladny.
 *
 * Košík i pokladna umí kód ověřit, ale objednávku zakládá až pokladna – bez
 * tohohle mezikroku by zákaznice kód zadala v košíku, viděla přepočet a pak
 * ho v pokladně musela zadat znovu.
 *
 * Drží se v `sessionStorage`, ne v localStorage: uplatněný kód patří k jednomu
 * nákupu, ne k prohlížeči navždy. Autorita to není – server obojí ověřuje
 * znovu při zakládání objednávky.
 */
'use client';

const KLIC = 'linda_kody';

export interface UlozeneKody {
  sleva: { kod: string; procentoSlevy: number } | null;
  poukaz: { kod: string; zustatek: number } | null;
}

const PRAZDNE: UlozeneKody = { sleva: null, poukaz: null };

export function nacistKody(): UlozeneKody {
  if (typeof window === 'undefined') return PRAZDNE;

  try {
    const ulozene = sessionStorage.getItem(KLIC);
    if (!ulozene) return PRAZDNE;

    const data = JSON.parse(ulozene) as Partial<UlozeneKody>;
    return {
      sleva: data.sleva?.kod ? data.sleva : null,
      poukaz: data.poukaz?.kod ? data.poukaz : null,
    };
  } catch {
    // Rozbitý obsah není důvod k pádu – kód se prostě zadá znovu.
    return PRAZDNE;
  }
}

export function ulozitKody(kody: UlozeneKody): void {
  if (typeof window === 'undefined') return;

  try {
    if (!kody.sleva && !kody.poukaz) {
      sessionStorage.removeItem(KLIC);
      return;
    }
    sessionStorage.setItem(KLIC, JSON.stringify(kody));
  } catch {
    // Privátní režim může úložiště zakázat; kód pak jen nepřežije přechod
    // do pokladny, nákup tím nespadne.
  }
}

export function zapomenoutKody(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KLIC);
  } catch {
    /* viz výše */
  }
}
