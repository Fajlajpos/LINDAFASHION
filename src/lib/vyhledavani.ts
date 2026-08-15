/**
 * Vyhledávání v katalogu podle klíčových slov.
 *
 * Do téhle chvíle byl `hledat` jediný `contains` nad `nazev`, `popis` a
 * `znacka`. To znamenalo, že zákaznice musela trefit **souvislý úsek textu
 * včetně diakritiky**:
 *
 *     "saty"          → nenašlo „Hedvábné šaty Bellissima" (š ≠ s)
 *     "hedvabne saty" → nenašlo nic, i s diakritikou: v názvu je mezi slovy
 *                       „šaty" a „Bellissima" jiné pořadí, než jaké napsala
 *     "svetr kasmir"  → nenašlo „Kašmírový svetr Roma", slova jsou přehozená
 *
 * Řešení má dvě poloviny a obě jsou nutné:
 *
 * 1. **Normalizovaný text v databázi** (`Product.hledaciText`,
 *    `Category.hledaciNazev`) – malá písmena, bez diakritiky, bez
 *    interpunkce. Dotaz projde stejnou funkcí, takže „saty" a „Šaty" jsou
 *    na obou stranách totéž.
 *
 *    Proč sloupec, a ne `unaccent()` v dotazu: `nacistProdukty` skládá filtr
 *    kategorie, velikosti, ceny, řazení a stránkování přes Prisma builder.
 *    Kvůli jedné podmínce přepsat celý dotaz do `$queryRaw` znamená napsat si
 *    znovu i stránkování a `count()` – a rozejít veřejný katalog s tím, co
 *    ukazuje našeptávač. Sloupec drží obojí v jednom dotazu.
 *
 * 2. **Rozklad dotazu na slova.** Každé slovo musí sedět někde v textu,
 *    nezávisle na pořadí.
 *
 * Vedlejší, ale příjemný důsledek normalizace: v tokenu po ní nezbude nic
 * než `[a-z0-9]`, takže se do `LIKE` nemá jak dostat `%` ani `_` a vzor si
 * nikdo nerozšíří na „všechno".
 */
import type { Prisma } from '@prisma/client';

/** Kombinující diakritická znaménka, která zbydou po rozkladu na NFD. */
const DIAKRITIKA = /[̀-ͯ]/g;

/**
 * "Hedvábné ŠATY – Bellissima!" → "hedvabne saty bellissima"
 *
 * Stejná funkce běží na obou stranách porovnání: nad textem produktu při
 * ukládání i nad tím, co zákaznice napsala. Kdyby se rozešly, hledání
 * přestane nacházet a nikdo nepozná proč.
 */
export function normalizovat(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIAKRITIKA, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Text, ve kterém se u produktu hledá.
 *
 * Kategorie tu schválně **není**, přestože by se hledat podle ní mělo.
 * Uložená kopie cizího názvu zestárne ve chvíli, kdy někdo kategorii
 * přejmenuje, a produkty by se pak našly pod jménem, které už neexistuje.
 * Kategorie má vlastní `hledaciNazev` a přiřazuje se přes relaci – viz
 * `podminkaHledani`.
 *
 * `popis` uvnitř je záměr: „len", „kašmír" nebo „zavinovací" bývá jen tam,
 * a přesně takhle lidé hledají, když neznají jméno modelu.
 */
export function hledaciTextProduktu(produkt: {
  nazev: string;
  znacka?: string | null;
  popis?: string | null;
  sku?: string | null;
  material?: string | null;
}): string {
  return normalizovat(
    [produkt.nazev, produkt.znacka, produkt.popis, produkt.sku, produkt.material]
      .filter(Boolean)
      .join(' ')
  );
}

/** Totéž pro kategorii – hledá se v jejím názvu. */
export function hledaciNazevKategorie(kategorie: { nazev: string }): string {
  return normalizovat(kategorie.nazev);
}

/** Kratší slovo než tohle je do dotazu spíš šum („v", „a", překlep). */
const MIN_DELKA_SLOVA = 2;

/** Strop na počet slov: delší věta znamená delší dotaz, ne lepší výsledek. */
const MAX_SLOV = 6;

/**
 * "Hedvábné ŠATY  bellissima" → ["hedvabne", "saty", "bellissima"]
 *
 * Jednopísmenný dotaz ("M") by po odfiltrování krátkých slov zůstal prázdný
 * a hledání by se tiše vyplo – zákaznice by pod nadpisem „Výsledky pro M"
 * viděla celý katalog. Zbude-li tedy po filtru nic, bereme celý normalizovaný
 * dotaz jako jedno slovo: široký výsledek je srozumitelnější než žádný filtr.
 */
export function rozlozitDotaz(dotaz: string): string[] {
  const cely = normalizovat(dotaz);
  if (!cely) return [];

  const slova = cely.split(' ').filter((s) => s.length >= MIN_DELKA_SLOVA);
  return Array.from(new Set(slova.length > 0 ? slova : [cely])).slice(0, MAX_SLOV);
}

/**
 * Podmínka do Prisma dotazu.
 *
 * `volne = false` (výchozí): **všechna** slova musí sedět, každé může být
 * v jiném poli. To je hledání, jak ho člověk čeká – „kasmirovy svetr" nemá
 * vracet každý svetr v katalogu.
 *
 * `volne = true`: stačí jedno slovo. Používá se jako záchrana, když přísná
 * varianta nenajde nic – místo „Nic jsme nenašli" ukážeme to nejbližší.
 * Pouštět rovnou volnou variantu nejde: u dvouslovného dotazu by první
 * stránku zaplavily shody na to obecnější ze slov.
 *
 * `mode: 'insensitive'` tu chybí schválně. Obě strany porovnání jsou už
 * malými písmeny, takže by `ILIKE` jen přidal práci navíc.
 */
export function podminkaHledani(tokeny: string[], volne = false): Prisma.ProductWhereInput | null {
  if (tokeny.length === 0) return null;

  const proSlovo = (slovo: string): Prisma.ProductWhereInput => ({
    OR: [
      { hledaciText: { contains: slovo } },
      { category: { hledaciNazev: { contains: slovo } } },
    ],
  });

  return volne ? { OR: tokeny.map(proSlovo) } : { AND: tokeny.map(proSlovo) };
}
