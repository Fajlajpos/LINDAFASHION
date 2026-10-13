/**
 * Souhlas s cookies (sekce 11 zadání).
 *
 * Jedno místo, které rozhoduje, jestli se smí spustit analytika a marketing.
 * Dřív souhlas nic neřídil – v liště byl jen `console.log('aktivuji Meta Pixel')`.
 *
 * Dvě pravidla, která musí platit vždy:
 *   • Volitelné kategorie startují VYPNUTÉ. Předzaškrtnutý souhlas GDPR neuznává.
 *   • Skript se smí načíst až po souhlasu, ne dřív a pak "vypnout".
 *
 * A tři, které se doplnily v 2026-10:
 *   • Souhlas platí k **verzi** zásad a **12 měsíců**. Uložená volba bez verze
 *     nebo k jinému textu se nepočítá a lišta se zeptá znovu – souhlas s textem,
 *     který návštěvnice neviděla, není informovaný.
 *   • Nabízí se jen to, co opravdu běží. Bez `NEXT_PUBLIC_GA_ID` se analytika
 *     v liště neobjeví, bez obou ID se lišta neukáže vůbec – žádat souhlas
 *     s nástrojem, který web nespouští, je slib, který nic nekryje.
 *   • Když později přibude nástroj, se kterým se při minulém rozhodnutí
 *     nepočítalo, lišta se zeptá znovu (`nabidnuto`). Jinak by „Povolit vše"
 *     z doby bez Pixelu tiše pokrylo i Pixel.
 */

/**
 * Verze textu zásad cookies.
 *
 * Zvedněte ji při každé věcné změně zásad (`/cookies`, texty lišty). Zapisuje
 * se do serverové evidence a prohlížeč podle ní pozná, že uložený souhlas
 * patří ke starému textu.
 *
 * 2026-10-13: pryč nepravdivé „anonymně", přibyl seznam cookies, příjemci
 * a předávání do USA.
 */
export const VERZE_ZASAD_COOKIES = '2026-10-13';

/**
 * Jak dlouho platí rozhodnutí, než se lišta zeptá znovu.
 *
 * Zákon lhůtu nestanoví; 12 měsíců je obvyklá praxe dozorových úřadů.
 * Platí i pro odmítnutí – i to se po roce smí zeptat znovu.
 */
export const PLATNOST_SOUHLASU_DNU = 365;

/*
 * Která volitelná kategorie má nástroj. `process.env.NEXT_PUBLIC_*` se vkládá
 * při buildu doslovně, proto přímé čtení, ne `process.env[klic]`.
 */
export function jeAnalytikaNastavena(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GA_ID?.trim());
}

export function jeMarketingNastaven(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

export interface NastaveneKategorie {
  analyticke: boolean;
  marketingove: boolean;
}

export function nastaveneKategorie(): NastaveneKategorie {
  return { analyticke: jeAnalytikaNastavena(), marketingove: jeMarketingNastaven() };
}

export interface SouhlasCookies {
  /** Košík, přihlášení, bezpečnost. Nelze odmítnout, proto tu není jako volba. */
  nezbytne: true;
  analyticke: boolean;
  marketingove: boolean;
}

export const KLIC_SOUHLASU = 'linda_cookie_consent';

/**
 * Klíč pod nímž si prohlížeč drží náhodný identifikátor návštěvnice.
 *
 * Slouží **jen** k tomu, aby se v evidenci souhlasů dala spojit jednotlivá
 * rozhodnutí téže osoby („nejdřív odmítla, později povolila analytiku“).
 * Bez něj by evidence byla hromada nespojitelných řádků a nedoložila by,
 * že dnešní stav souhlasu je ten poslední.
 */
export const KLIC_SUBJEKTU = 'linda_consent_id';

/** Výchozí stav do doby, než návštěvnice rozhodne. Nic volitelného zapnuté. */
export const VYCHOZI_SOUHLAS: SouhlasCookies = {
  nezbytne: true,
  analyticke: false,
  marketingove: false,
};

/** Událost na `window`, aby skripty reagovaly na změnu bez načtení stránky. */
export const UDALOST_ZMENA_SOUHLASU = 'linda:souhlas-zmenen';

/** Co se ukládá do `localStorage` – volba plus to, k čemu se vztahuje. */
interface UlozenySouhlas {
  analyticke: boolean;
  marketingove: boolean;
  verze: string;
  /** ISO 8601 – kdy návštěvnice rozhodla. */
  rozhodnutoAt: string;
  /** Které kategorie lišta v tu chvíli nabízela. */
  nabidnuto: NastaveneKategorie;
}

/**
 * Přečte uložený řetězec a rozhodne, jestli rozhodnutí ještě platí.
 *
 * Čistá funkce bez `window`, aby se dala testovat. `null` = zeptat se znovu:
 * nic uloženo, poškozený JSON, jiná verze zásad, starší než
 * `PLATNOST_SOUHLASU_DNU`, nebo dnes běží nástroj, který tehdy nabídnut nebyl.
 *
 * Volby starších verzí lišty (bez `verze`) neplatí schválně: byly dané
 * k textu, který analytiku nepravdivě označoval za anonymní.
 */
export function platnySouhlas(
  ulozeno: string | null,
  ted: Date,
  nastaveno: NastaveneKategorie
): SouhlasCookies | null {
  if (!ulozeno) return null;

  let data: Partial<UlozenySouhlas>;
  try {
    data = JSON.parse(ulozeno);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  if (data.verze !== VERZE_ZASAD_COOKIES) return null;

  const kdy = new Date(data.rozhodnutoAt ?? '').getTime();
  if (Number.isNaN(kdy)) return null;
  if (ted.getTime() - kdy > PLATNOST_SOUHLASU_DNU * 24 * 60 * 60 * 1000) return null;

  const nabidnuto = data.nabidnuto;
  if (nastaveno.analyticke && !nabidnuto?.analyticke) return null;
  if (nastaveno.marketingove && !nabidnuto?.marketingove) return null;

  return {
    nezbytne: true,
    // Souhlas s nástrojem, který už neběží, se nevrací – kdyby se ID později
    // vrátilo, nesmí se spustit na rozhodnutí, které je dávno pryč z oběhu.
    analyticke: nastaveno.analyticke && data.analyticke === true,
    marketingove: nastaveno.marketingove && data.marketingove === true,
  };
}

/** Vrací `null`, dokud návštěvnice nerozhodla – podle toho se zobrazuje lišta. */
export function nacistSouhlas(): SouhlasCookies | null {
  if (typeof window === 'undefined') return null;

  try {
    return platnySouhlas(
      window.localStorage.getItem(KLIC_SOUHLASU),
      new Date(),
      nastaveneKategorie()
    );
  } catch {
    // Zablokované úložiště (soukromé okno, zakázaná data webu) = nerozhodnuto.
    return null;
  }
}

/**
 * Náhodný identifikátor návštěvnice pro evidenci souhlasů.
 *
 * Záměrně `crypto.randomUUID()`, ne otisk prohlížeče ani hash IP: identifikátor
 * odvozený z něčeho, co návštěvnici popisuje, by byl sledováním – tedy právě
 * tím, co ten souhlas teprve povoluje. Náhodné číslo o ní neříká nic.
 */
export function idSubjektu(): string {
  const ulozene = window.localStorage.getItem(KLIC_SUBJEKTU);
  if (ulozene) return ulozene;

  // `randomUUID` chybí v nezabezpečeném kontextu (http na LAN při testování
  // na telefonu) – záložka není kryptograficky silná, ale k odlišení
  // dvou návštěvnic stačí a nesmí to shodit celou lištu.
  const nove =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  window.localStorage.setItem(KLIC_SUBJEKTU, nove);
  return nove;
}

/**
 * Odeslání rozhodnutí do serverové evidence (čl. 7 odst. 1 GDPR).
 *
 * `void` a `catch` schválně: lišta se musí dát odkliknout i tehdy, když je
 * server nedostupný. Souhlas platí tím, že ho návštěvnice udělila, ne tím,
 * že se nám ho podařilo zapsat – a zablokovaná lišta by zablokovala web.
 */
export function odeslatSouhlasNaServer(souhlas: SouhlasCookies): void {
  if (typeof window === 'undefined') return;

  void fetch('/api/souhlas', {
    method: 'POST',
    // Odvolání souhlasu hned potom znovu načte stránku. Bez `keepalive` by
    // prohlížeč požadavek při odchodu zrušil a v evidenci by odvolání chybělo.
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjekt: idSubjektu(),
      analyticke: souhlas.analyticke,
      marketingove: souhlas.marketingove,
    }),
  }).catch(() => {
    // Ticho je záměr. Chyba sítě není nic, s čím by zákaznice mohla pohnout.
  });
}

export function ulozitSouhlas(souhlas: SouhlasCookies): void {
  if (typeof window === 'undefined') return;

  const nabidnuto = nastaveneKategorie();
  const zaznam: UlozenySouhlas = {
    // Souhlas jde jen s tím, co lišta nabídla – „Povolit vše" bez Pixelu
    // nesmí uložit `marketingove: true` pro Pixel, který přibude později.
    analyticke: nabidnuto.analyticke && souhlas.analyticke,
    marketingove: nabidnuto.marketingove && souhlas.marketingove,
    verze: VERZE_ZASAD_COOKIES,
    rozhodnutoAt: new Date().toISOString(),
    nabidnuto,
  };

  try {
    window.localStorage.setItem(KLIC_SOUHLASU, JSON.stringify(zaznam));
  } catch {
    // Zablokované úložiště: volba platí aspoň do konce návštěvy přes událost níž.
  }
  window.dispatchEvent(new CustomEvent<SouhlasCookies>(UDALOST_ZMENA_SOUHLASU, { detail: souhlas }));
}

/**
 * Odvolání souhlasu nestačí ošetřit tím, že skript příště nenačteme – GA4
 * i Meta Pixel si drží vlastní cookies. Tohle je smaže.
 */
export function smazatSledovaciCookies(): void {
  if (typeof document === 'undefined') return;

  const sledovaci = /^(_ga|_gid|_gat|_fbp|_fbc)/;
  const domena = window.location.hostname;

  for (const zaznam of document.cookie.split(';')) {
    const nazev = zaznam.split('=')[0]?.trim();
    if (!nazev || !sledovaci.test(nazev)) continue;

    // Smazat je potřeba na všech variantách cesty i domény, jinak zůstanou.
    for (const d of ['', `; domain=${domena}`, `; domain=.${domena}`]) {
      document.cookie = `${nazev}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
    }
  }
}
