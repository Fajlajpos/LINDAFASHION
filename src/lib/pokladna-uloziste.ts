/**
 * Rozpracovaná pokladna – co zákaznice vybrala a vyplnila v krocích 2 a 3.
 *
 * Mezi kroky žije stav v paměti (`PokladnaProvider` v layoutu, který se při
 * přechodu mezi kroky nepřemontuje). Sem se zrcadlí jen proto, aby obnovení
 * stránky nesmazalo vyplněnou adresu.
 *
 * `sessionStorage`, ne localStorage: koncept patří k jednomu nákupu v jedné
 * záložce a s jejím zavřením zmizí. Zapisuje se až první volbou nebo úpravou,
 * nikdy při pouhém zobrazení, a maže se odesláním objednávky i vyprázdněním
 * košíku. Klíč je popsaný na `/cookies`.
 */
'use client';

const KLIC = 'linda_pokladna';

export type ZpusobPlatby = 'bankovni_prevod' | 'gopay';

export interface UdajeZakaznice {
  email: string;
  dodaciJmenoPrijmeni: string;
  dodaciTelefon: string;
  dodaciUlice: string;
  dodaciMesto: string;
  dodaciPsc: string;
  poznamka: string;
}

export interface KonceptPokladny {
  zpusobDopravy: string;
  vydejniMisto: { id: string; nazev: string } | null;
  zpusobPlatby: ZpusobPlatby;
  udaje: UdajeZakaznice;
  /**
   * Které kroky zákaznice odklepla tlačítkem „Pokračovat".
   *
   * Platné hodnoty samy nestačí: doprava je předvybraná a adresa se
   * předvyplní z účtu, takže by šlo „přeskočit" na shrnutí krokem, který
   * nikdy neviděla.
   */
  potvrzeno: { doprava: boolean; udaje: boolean };
}

export function nacistKoncept(): KonceptPokladny | null {
  if (typeof window === 'undefined') return null;

  try {
    const ulozene = sessionStorage.getItem(KLIC);
    if (!ulozene) return null;

    const data = JSON.parse(ulozene) as Partial<KonceptPokladny>;
    if (!data || typeof data !== 'object' || !data.udaje || !data.potvrzeno) return null;

    return data as KonceptPokladny;
  } catch {
    // Rozbitý obsah není důvod k pádu – údaje se prostě vyplní znovu.
    return null;
  }
}

export function ulozitKoncept(koncept: KonceptPokladny): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(KLIC, JSON.stringify(koncept));
  } catch {
    // Privátní režim může úložiště zakázat; koncept pak jen nepřežije obnovení.
  }
}

export function zapomenoutKoncept(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(KLIC);
  } catch {
    /* viz výše */
  }
}
