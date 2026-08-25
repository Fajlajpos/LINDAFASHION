/**
 * Identifikace dodavatele na účetním dokladu.
 *
 * Vlastní soubor, ne kus `nastaveni.ts`, kvůli hranici runtimů: snímek zapisuje
 * pokladna (Next) a čte ho **worker** při generování faktury. `nastaveni.ts`
 * přitom importuje `cache()` z Reactu, což je serverová záležitost Nextu –
 * worker by na tom spadl. Stejná úvaha jako u `session.ts` vs `auth.ts`.
 *
 * Bez aliasů `@/` – kompiluje se do buildu workeru, kde je `tsc` nepřepisuje.
 */

/**
 * Údaje dodavatele tak, jak platily v okamžiku objednávky.
 *
 * Ukládá se do `Order.dodavatelSnapshot` (Json). Všechna pole jsou nepovinná:
 * majitelka je vyplňuje postupně a doklad má vyjít i s dírami – nevyplněný
 * údaj se prostě nevytiskne. Vymyslet si ho by bylo horší.
 */
export interface SnimekDodavatele {
  nazev: string | null;
  ico: string | null;
  dic: string | null;
  adresa: string | null;
  email: string | null;
  /** Zápis ve veřejném či živnostenském rejstříku (§ 435 o. z.). */
  zapisVRejstriku: string | null;
}

/** Zdroj snímku – `Settings` v jakékoli podobě, stačí tahle pole. */
export interface ZdrojDodavatele {
  nazevFirmy: string | null;
  icoFirmy: string | null;
  dicFirmy: string | null;
  adresaFirmy: string | null;
  emailFirmy: string | null;
  zapisVRejstriku: string | null;
}

export function snimekDodavatele(zdroj: ZdrojDodavatele): SnimekDodavatele {
  return {
    nazev: zdroj.nazevFirmy,
    ico: zdroj.icoFirmy,
    dic: zdroj.dicFirmy,
    adresa: zdroj.adresaFirmy,
    email: zdroj.emailFirmy,
    zapisVRejstriku: zdroj.zapisVRejstriku,
  };
}

/**
 * Přečte snímek z `Order.dodavatelSnapshot`.
 *
 * Sloupec je `Json`, takže z databáze přijde `unknown` – tvar se musí ověřit,
 * ne předpokládat. Vrací `null` u objednávek založených dřív, než sloupec
 * existoval; volající pak sáhne do aktuálního `Settings` jako dosud. Doplňovat
 * staré řádky zpětně nejde: nikdo neví, co na tehdejším dokladu stálo.
 */
export function precistSnimekDodavatele(hodnota: unknown): SnimekDodavatele | null {
  if (hodnota === null || typeof hodnota !== 'object' || Array.isArray(hodnota)) return null;

  const zaznam = hodnota as Record<string, unknown>;
  const text = (klic: string): string | null =>
    typeof zaznam[klic] === 'string' && zaznam[klic] !== '' ? (zaznam[klic] as string) : null;

  /*
   * Prázdný snímek (samé `null`) se chová jako chybějící. Vznikne u objednávky
   * z doby, kdy majitelka firemní údaje ještě nevyplnila – a tehdy je lepší
   * ukázat, co je v nastavení dnes, než vytisknout doklad bez dodavatele.
   */
  const snimek: SnimekDodavatele = {
    nazev: text('nazev'),
    ico: text('ico'),
    dic: text('dic'),
    adresa: text('adresa'),
    email: text('email'),
    zapisVRejstriku: text('zapisVRejstriku'),
  };

  return Object.values(snimek).some((v) => v !== null) ? snimek : null;
}
