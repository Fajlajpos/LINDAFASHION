/**
 * Widget Zásilkovny pro výběr výdejního místa – klientská část.
 *
 * Mapu kreslí knihovna Zásilkovny, ne my. Tenhle modul ji jen **líně načte**
 * (až při prvním kliknutí, ne při každém načtení pokladny – je to cizí skript
 * a většina zákaznic si mapu nikdy neotevře) a převede výsledek na dvojici
 * `{ id, nazev }`, kterou objednávka ukládá do `vydejniMistoId`
 * a `vydejniMistoNazev`.
 *
 * Do téhle chvíle byla pobočka **volný text**: zákaznice napsala „Praha 1,
 * Vodičkova" a objednávka si to uložila tak, jak to přišlo. Překlep se poznal
 * až při podání zásilky, kdy balík neměl kam jet.
 */

/** Výdejní místo tak, jak ho ukládá objednávka. */
export interface VybraneVydejniMisto {
  /** Identifikátor pobočky u Zásilkovny (`vydejniMistoId`). */
  id: string;
  /** Čitelný popis pro zákaznici i pro administraci (`vydejniMistoNazev`). */
  nazev: string;
}

/** Tvar, ve kterém pobočku vrací knihovna Zásilkovny. */
interface BodWidgetu {
  id?: string | number;
  name?: string;
  place?: string;
  street?: string;
  city?: string;
  zip?: string;
  /** Předpřipravený jednořádkový popis – když ho knihovna dodá, má přednost. */
  formatedValue?: string;
}

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick(
          apiKey: string,
          zpetnaVazba: (bod: BodWidgetu | null) => void,
          moznosti?: Record<string, unknown>,
        ): void;
      };
    };
  }
}

const ADRESA_KNIHOVNY = 'https://widget.packeta.com/v6/www/js/library.js';

/**
 * Délkové stropy z `objednavkaSchema`.
 *
 * Popis pobočky skládá Zásilkovna a u dlouhých názvů („Zásilkovna – …")
 * umí přesáhnout limit sloupce. Uříznutí tady je lepší než validační chyba
 * na konci pokladny, kde už zákaznice neví, co s tím.
 */
const MAX_ID = 120;
const MAX_NAZEV = 300;

/** Rozdělaný požadavek na načtení knihovny – ať se nestahuje dvakrát. */
let nacitani: Promise<void> | null = null;

function nacistKnihovnu(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Widget Zásilkovny jde otevřít jen v prohlížeči.'));
  }

  if (window.Packeta) return Promise.resolve();
  if (nacitani) return nacitani;

  nacitani = new Promise<void>((splnit, zamitnout) => {
    const script = document.createElement('script');
    script.src = ADRESA_KNIHOVNY;
    script.async = true;

    script.onload = () => splnit();

    script.onerror = () => {
      /*
       * Neúspěch se musí zapomenout, jinak by jeden výpadek spojení (nebo
       * blokovaný skript) zamkl výběr pobočky až do obnovení stránky –
       * každé další kliknutí by dostalo tentýž zamítnutý příslib.
       */
      nacitani = null;
      script.remove();
      zamitnout(new Error('Mapu výdejních míst se nepodařilo načíst.'));
    };

    document.head.appendChild(script);
  });

  return nacitani;
}

/** Jednořádkový popis pobočky. */
function popisBodu(bod: BodWidgetu): string {
  if (bod.formatedValue?.trim()) return bod.formatedValue.trim();

  // Záloha pro případ, že knihovna hotový popis nepošle.
  const casti = [bod.name, bod.street, bod.city].filter(
    (cast): cast is string => Boolean(cast?.trim()),
  );

  return casti.join(', ');
}

/**
 * Otevře mapu a počká, až si zákaznice vybere.
 *
 * Vrací `null`, když okno zavře bez výběru – to není chyba a volající s tím
 * nemá zacházet jako s chybou. Selhání načtení knihovny naopak vyhodí výjimku,
 * aby pokladna mohla nabídnout ruční zápis pobočky.
 *
 * `onOtevreno` se zavolá ve chvíli, kdy je mapa na obrazovce – **ne** až si
 * zákaznice vybere. Bez toho by volající musel držet „načítám" po celou dobu,
 * co si prohlíží pobočky, a kdyby okno zavřela křížkem, zůstalo by tlačítko
 * zablokované napořád: `pick()` v takovém případě nemusí zavolat zpětnou vazbu
 * vůbec, takže by se příslib nikdy nesplnil.
 */
export async function vybratVydejniMisto(
  klic: string,
  onOtevreno?: () => void,
): Promise<VybraneVydejniMisto | null> {
  await nacistKnihovnu();

  const widget = window.Packeta?.Widget;
  if (!widget) {
    throw new Error('Knihovna Zásilkovny se načetla, ale výběr poboček v ní není.');
  }

  return new Promise<VybraneVydejniMisto | null>((splnit) => {
    widget.pick(
      klic,
      (bod) => {
        if (!bod || bod.id === undefined || bod.id === null) {
          splnit(null);
          return;
        }

        const nazev = popisBodu(bod);
        splnit({
          id: String(bod.id).slice(0, MAX_ID),
          // Bez popisu by v administraci svítilo jen číslo pobočky.
          nazev: (nazev || String(bod.id)).slice(0, MAX_NAZEV),
        });
      },
      { language: 'cs', country: 'cz' },
    );

    // `pick()` vykreslí překryv rovnou, takže po jeho návratu mapa stojí.
    onOtevreno?.();
  });
}
