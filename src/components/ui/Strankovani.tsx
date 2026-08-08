import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  stranka: number;
  stranek: number;
  /** Sestaví adresu dané stránky – volající drží ostatní parametry v URL. */
  odkaz: (cislo: number) => string;
  /** Popis pro odečítač obrazovky, např. „Stránkování objednávek". */
  popisek: string;
}

/**
 * Stránkování.
 *
 * Vypisuje okno kolem aktuální stránky, ne všechna čísla. Katalog dřív
 * renderoval každé – při dvou stech stranách to je dvě stě odkazů, přes které
 * se musí odečítač obrazovky probrat, než se dostane dál.
 *
 * Vrací vždy stejnou kostru (první · … · okno · … · poslední), takže odkazy
 * pod prstem neposkakují, jak se čísla mění.
 */
function oknoStranek(stranka: number, stranek: number): Array<number | 'mezera'> {
  const OKOLI = 1;

  const cisla = new Set<number>([1, stranek]);
  for (let i = stranka - OKOLI; i <= stranka + OKOLI; i++) {
    if (i >= 1 && i <= stranek) cisla.add(i);
  }

  const serazena = [...cisla].sort((a, b) => a - b);
  const vysledek: Array<number | 'mezera'> = [];

  for (const [i, cislo] of serazena.entries()) {
    // Mezeru vkládáme jen když opravdu něco přeskakujeme; u rozdílu 2 je
    // levnější vypsat chybějící číslo než výpustku.
    const predchozi = serazena[i - 1];
    if (predchozi !== undefined) {
      if (cislo - predchozi === 2) vysledek.push(cislo - 1);
      else if (cislo - predchozi > 2) vysledek.push('mezera');
    }
    vysledek.push(cislo);
  }

  return vysledek;
}

const TRIDY_DLAZDICE =
  'flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-lg px-3 text-xs font-semibold transition-all duration-200';

export function Strankovani({ stranka, stranek, odkaz, popisek }: Props) {
  if (stranek <= 1) return null;

  const polozky = oknoStranek(stranka, stranek);

  return (
    <nav aria-label={popisek} className="flex flex-wrap items-center justify-center gap-2 pt-4">
      {stranka > 1 && (
        <Link
          href={odkaz(stranka - 1)}
          rel="prev"
          aria-label="Předchozí stránka"
          className={`${TRIDY_DLAZDICE} bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      {polozky.map((polozka, i) =>
        polozka === 'mezera' ? (
          <span
            key={`mezera-${i}`}
            aria-hidden="true"
            className="px-1 text-xs text-linda-espresso/60"
          >
            …
          </span>
        ) : (
          <Link
            key={polozka}
            href={odkaz(polozka)}
            aria-label={`Stránka ${polozka}`}
            aria-current={polozka === stranka ? 'page' : undefined}
            className={`${TRIDY_DLAZDICE} ${
              polozka === stranka
                ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm'
            }`}
          >
            {polozka}
          </Link>
        )
      )}

      {stranka < stranek && (
        <Link
          href={odkaz(stranka + 1)}
          rel="next"
          aria-label="Další stránka"
          className={`${TRIDY_DLAZDICE} bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu active:shadow-neuInsetSm`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

/** Přečte `?stranka=` z URL; cokoliv nesmyslného spadne na 1. */
export function cisloStranky(hodnota: string | undefined): number {
  const cislo = Number(hodnota ?? 1);
  return Number.isFinite(cislo) && cislo >= 1 ? Math.floor(cislo) : 1;
}
