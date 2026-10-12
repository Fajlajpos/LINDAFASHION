/**
 * Kamenná prodejna – čisté pomocné funkce nad údaji ze `Settings`.
 *
 * Bez Prismy a bez `next/*`, takže je volá serverová stránka, klientská
 * patička i strukturovaná data a dají se testovat bez databáze.
 *
 * Prodejna má **jiný výběr než e-shop** (majitel webu, 2026-10). Texty kolem ní
 * ji proto nikde nesmí podávat jako místo, kde si zákaznice vyzkouší zboží
 * z e-shopu – to by nebyla pravda. Důvod přijít je právě to, co online není.
 */

export interface RozlozenaAdresa {
  /** „Rokycanova 1929" */
  ulice: string | null;
  /** „356 01" */
  psc: string | null;
  /** „Sokolov" */
  mesto: string | null;
}

/**
 * „Linda Fashion, Rokycanova 1929, 356 01 Sokolov" → ulice, PSČ, město.
 *
 * Adresa je v administraci jeden volný řádek a majitelka do něj píše i název
 * obchodu. Poslední část za čárkou je „PSČ město", předposlední ulice,
 * cokoli před tím (jméno) se zahodí. Bez PSČ se celá poslední část bere jako
 * město – lepší než nic, Google si ji dohledá.
 */
export function rozlozitAdresu(adresa: string | null | undefined): RozlozenaAdresa | null {
  const casti = (adresa ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (casti.length === 0) return null;

  const posledni = casti[casti.length - 1];
  const sPsc = posledni.match(/^(\d{3})\s?(\d{2})\s+(.+)$/);

  return {
    ulice: casti.length > 1 ? casti[casti.length - 2] : null,
    psc: sPsc ? `${sPsc[1]} ${sPsc[2]}` : null,
    mesto: sPsc ? sPsc[3] : posledni,
  };
}

/** „Rokycanova 1929, Sokolov" – do patičky, kde není místo na PSČ. */
export function kratkaAdresa(adresa: string | null | undefined): string | null {
  const a = rozlozitAdresu(adresa);
  if (!a) return null;
  return [a.ulice, a.mesto].filter(Boolean).join(', ') || null;
}

/**
 * Odkaz na Google Maps. Jen odkaz, ne vložená mapa: iframe by načítal cookies
 * třetí strany ještě před souhlasem v cookie liště.
 */
export function odkazNaMapu(adresa: string | null | undefined): string | null {
  const a = rozlozitAdresu(adresa);
  if (!a) return null;

  const dotaz = [a.ulice, [a.psc, a.mesto].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dotaz)}`;
}

/** První dvě písmena dne bez diakritiky → kód schema.org. Zvládne „Po" i „pondělí". */
const DNY: Record<string, string> = {
  po: 'Mo',
  ut: 'Tu',
  st: 'We',
  ct: 'Th',
  pa: 'Fr',
  so: 'Sa',
  ne: 'Su',
};

function bezDiakritiky(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function cas(hodiny: string, minuty: string | undefined): string | null {
  const h = Number(hodiny);
  const m = minuty === undefined ? 0 : Number(minuty);
  if (h > 24 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Otevírací doba z administrace → `openingHours` pro schema.org.
 *
 *   „Po–Čt: 10:00–12:00, 12:30–17:00"  →  „Mo-Th 10:00-12:00", „Mo-Th 12:30-17:00"
 *   „So–Ne: zavřeno"                   →  nic (zavřené dny se neuvádějí)
 *
 * Je to volný text, takže se může stát, že ho nepřečteme. Pak `null` a do dat
 * pro Google nejde **nic** – zkomolená otevírací doba v mapách je horší než
 * žádná, protože by poslala zákaznici k zavřenému obchodu. Na webu se text
 * ukazuje vždycky tak, jak ho majitelka napsala.
 */
export function oteviraciDobaProSchema(text: string | null | undefined): string[] | null {
  const radky = (text ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  if (radky.length === 0) return null;

  const vysledek: string[] = [];

  for (const radek of radky) {
    const r = bezDiakritiky(radek);
    const shoda = r.match(/^([a-z]+)(?:\s*[-–—]\s*([a-z]+))?\s*:?\s*(.+)$/);
    if (!shoda) return null;

    const od = DNY[shoda[1].slice(0, 2)];
    const doDne = shoda[2] ? DNY[shoda[2].slice(0, 2)] : null;
    if (!od || (shoda[2] && !doDne)) return null;

    const dny = doDne ? `${od}-${doDne}` : od;
    const zbytek = shoda[3].trim();

    if (/^zavreno\.?$/.test(zbytek)) continue;

    for (const interval of zbytek.split(',')) {
      const i = interval.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?$/);
      if (!i) return null;

      const zacatek = cas(i[1], i[2]);
      const konec = cas(i[3], i[4]);
      if (!zacatek || !konec) return null;

      vysledek.push(`${dny} ${zacatek}-${konec}`);
    }
  }

  return vysledek.length > 0 ? vysledek : null;
}
