/**
 * Způsoby doručení – jeden seznam pro celý e-shop.
 *
 * ## Popisy tady, ceny v administraci
 *
 * V souboru zůstává jen to, co se nemění bez zásahu do kódu: identifikátor,
 * název dopravce, popis a jestli metoda potřebuje výdejní místo. **Cena tu
 * není.** Ceny drží `Settings` (`cenaDopravyZasilkovna` a spol.), protože je
 * majitelka mění z administrace.
 *
 * Do téhle chvíle existovaly dva nezávislé seznamy: tenhle s natvrdo zapsanými
 * cenami 79/109/99 Kč, ze kterého se vykreslovala stránka „Doprava a platba",
 * a druhý přímo v pokladně, který četl `Settings`. Informační stránka tedy
 * mohla slibovat jinou cenu, než pokladna naúčtovala – a cena dopravy je údaj,
 * který musí prodávající sdělit **před** uzavřením smlouvy (§ 1820 odst. 1
 * písm. e o. z.). Navíc se rozcházely i názvy dopravců.
 *
 * `dostupneDopravy()` je proto jediná cesta, jak se k nabídce dostat: metoda
 * bez vyplněné ceny se nenabízí nikde, protože z ní nejde spočítat objednávka.
 */
import type { NastaveniWebu } from './nastaveni';

export interface PopisDopravy {
  id: string;
  nazev: string;
  popis: string;
  vyzadujeVydejniMisto: boolean;
}

/** Doprava i s cenou z administrace. */
export interface DopravaSCenou extends PopisDopravy {
  cena: number;
}

export const ZPUSOBY_DOPRAVY: readonly PopisDopravy[] = [
  {
    id: 'zasilkovna',
    nazev: 'Zásilkovna – výdejní místo nebo Z-BOX',
    popis: 'Doručení na vybrané výdejní místo nebo do samoobslužného Z-BOXu.',
    vyzadujeVydejniMisto: true,
  },
  {
    id: 'ppl',
    nazev: 'PPL – doručení na adresu',
    popis: 'Kurýr doveze zásilku až k vašim dveřím.',
    vyzadujeVydejniMisto: false,
  },
  {
    id: 'ceska_posta',
    nazev: 'Česká pošta – Balík Do ruky',
    popis: 'Doručení na uvedenou doručovací adresu.',
    vyzadujeVydejniMisto: false,
  },
];

/**
 * Nabídka dopravy podle nastavení.
 *
 * Vrací jen metody s vyplněnou cenou – prázdná cena znamená „tuhle dopravu
 * nenabízíme", ne „zdarma". Stejné pravidlo hlídá i `cenaDopravy()`
 * v [objednavka.ts](src/lib/objednavka.ts), aby si nabídku nešlo obejít
 * ručně sestaveným požadavkem.
 */
export function dostupneDopravy(nastaveni: NastaveniWebu): DopravaSCenou[] {
  const ceny: Record<string, number | null> = {
    zasilkovna: nastaveni.cenaDopravyZasilkovna,
    ppl: nastaveni.cenaDopravyPPL,
    ceska_posta: nastaveni.cenaDopravyCeskaPosta,
  };

  return ZPUSOBY_DOPRAVY.flatMap((zpusob) => {
    const cena = ceny[zpusob.id];
    return cena == null ? [] : [{ ...zpusob, cena }];
  });
}

/**
 * Věta o dopravě zdarma, nebo `null`, když se práh nenastavil.
 *
 * `null` je podstatný stav: „doprava zdarma nad 2 500 Kč" bývala natvrdo
 * v patičce i na stránce o dopravě, zatímco `prahDopravaZdarma` může být
 * prázdný a pokladna pak dopravu účtuje vždycky. Slib, který objednávka
 * nedodrží, je nekalá obchodní praktika – proto se text buď složí z nastavení,
 * nebo se nezobrazí vůbec.
 */
export function popisDopravyZdarma(nastaveni: NastaveniWebu): string | null {
  const prah = nastaveni.prahDopravaZdarma;
  if (prah == null) return null;

  return `Při nákupu nad ${prah.toLocaleString('cs-CZ')} Kč hradíme poštovné za vás.`;
}
