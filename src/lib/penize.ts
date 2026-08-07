/**
 * Práce s penězi.
 *
 * Uvnitř aplikace se počítá výhradně v **haléřích jako celých číslech**.
 * V databázi zůstávají ceny jako `Decimal` v korunách (tak je popisuje sekce 7
 * zadání), převod se dělá na hranici.
 *
 * Proč: `0.1 + 0.2 === 0.30000000000000004`. U jedné ceny je to jedno, ale
 * jakmile se sečte košík, odečte procentní sleva a část se uhradí dárkovým
 * poukazem (sekce 6.11), rozdíly se nasčítají a součet objednávky přestane
 * sedět s tím, co zákaznice viděla.
 *
 * Bez aliasů @/ a bez importu Prisma – používá to i worker při generování faktur.
 */

/** Částka v haléřích. Vždy celé číslo. */
export type Halere = number;

/** Cokoliv, co může přijít z databáze nebo z formuláře. */
export type CenaVstup = number | string | { toString(): string };

export function czkNaHalere(hodnota: CenaVstup): Halere {
  const cislo = typeof hodnota === 'number' ? hodnota : Number(hodnota.toString());

  if (!Number.isFinite(cislo)) {
    throw new Error(`Neplatná částka: ${String(hodnota)}`);
  }

  // Zaokrouhlení až po vynásobení – jinak by se chyba floatu přenesla dál.
  return Math.round(cislo * 100);
}

export function halereNaCzk(halere: Halere): number {
  return halere / 100;
}

/** "3 490 Kč" – české formátování podle konvence projektu. */
export function formatovatCenu(halere: Halere): string {
  const koruny = halereNaCzk(halere);
  const desetinna = halere % 100 !== 0;

  return `${koruny.toLocaleString('cs-CZ', {
    minimumFractionDigits: desetinna ? 2 : 0,
    maximumFractionDigits: 2,
  })} Kč`;
}

/**
 * Aktuální prodejní cena položky.
 *
 * Sekce 6.6: procentní sleva se počítá vždy z ceny, za kterou se zboží
 * právě prodává – tedy ze zlevněné ceny, pokud ji produkt má. Ne z původní,
 * jinak by se slevy sčítaly dvakrát.
 */
export function prodejniCena(cena: CenaVstup, cenaPoSleve?: CenaVstup | null): Halere {
  return cenaPoSleve == null ? czkNaHalere(cena) : czkNaHalere(cenaPoSleve);
}

/**
 * Procentní sleva. Zaokrouhluje se na celé haléře dolů, aby výsledek nikdy
 * nepřesáhl to, co zákaznici slibujeme.
 */
export function slevaZProcent(zaklad: Halere, procento: number): Halere {
  if (procento <= 0) return 0;
  const omezene = Math.min(100, Math.max(0, procento));
  return Math.floor((zaklad * omezene) / 100);
}

export interface PolozkaKosiku {
  cenaZaKus: Halere;
  mnozstvi: number;
}

export function mezisoucet(polozky: PolozkaKosiku[]): Halere {
  return polozky.reduce((soucet, p) => soucet + p.cenaZaKus * p.mnozstvi, 0);
}

export interface RozpisObjednavky {
  /** Součet položek za aktuální prodejní ceny. */
  mezisoucet: Halere;
  /** Kolik ubrala procentní sleva ze slevového kódu. */
  sleva: Halere;
  doprava: Halere;
  /** Kolik pokryl dárkový poukaz (nejvýš do výše zbývající částky). */
  zPoukazu: Halere;
  /** Co zbývá doplatit platební metodou. */
  kUhrade: Halere;
  /** Celková cena objednávky včetně dopravy, před uplatněním poukazu. */
  celkem: Halere;
}

export interface VypocetVstup {
  polozky: PolozkaKosiku[];
  /** Procento slevy ze slevového kódu (0–100). */
  procentoSlevy?: number;
  doprava?: Halere;
  /** Zůstatek na dárkovém poukazu. */
  zustatekPoukazu?: Halere;
}

/**
 * Spočítá rozpis objednávky v pořadí, které předepisuje zadání (sekce 6.11):
 *
 *   1. sečti položky za aktuální prodejní ceny
 *   2. odečti procentní slevu ze slevového kódu
 *   3. přičti dopravu
 *   4. teprve zbytek uhraď dárkovým poukazem
 *
 * Sleva se schválně nepočítá z dopravy – slevový kód platí na zboží.
 */
export function spocitatObjednavku({
  polozky,
  procentoSlevy = 0,
  doprava = 0,
  zustatekPoukazu = 0,
}: VypocetVstup): RozpisObjednavky {
  const soucetPolozek = mezisoucet(polozky);
  const sleva = slevaZProcent(soucetPolozek, procentoSlevy);
  const poSleve = soucetPolozek - sleva;
  const celkem = poSleve + doprava;

  // Poukaz nikdy nepokryje víc, než kolik zbývá zaplatit – přeplatek by se
  // jinak "ztratil" a zůstatek poukazu by klesl neprávem.
  const zPoukazu = Math.min(Math.max(0, zustatekPoukazu), celkem);

  return {
    mezisoucet: soucetPolozek,
    sleva,
    doprava,
    zPoukazu,
    kUhrade: celkem - zPoukazu,
    celkem,
  };
}
