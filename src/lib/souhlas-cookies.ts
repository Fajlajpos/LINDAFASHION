/**
 * Souhlas s cookies (sekce 11 zadání).
 *
 * Jedno místo, které rozhoduje, jestli se smí spustit analytika a marketing.
 * Dřív souhlas nic neřídil – v liště byl jen `console.log('aktivuji Meta Pixel')`.
 *
 * Dvě pravidla, která musí platit vždy:
 *   • Volitelné kategorie startují VYPNUTÉ. Předzaškrtnutý souhlas GDPR neuznává.
 *   • Skript se smí načíst až po souhlasu, ne dřív a pak "vypnout".
 */

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

/** Vrací `null`, dokud návštěvnice nerozhodla – podle toho se zobrazuje lišta. */
export function nacistSouhlas(): SouhlasCookies | null {
  if (typeof window === 'undefined') return null;

  const ulozeno = window.localStorage.getItem(KLIC_SOUHLASU);
  if (!ulozeno) return null;

  try {
    const data = JSON.parse(ulozeno) as Partial<SouhlasCookies> & {
      // Starší verze lišty ukládala anglické názvy; ať se souhlas neztratí.
      analytical?: boolean;
      marketing?: boolean;
    };

    return {
      nezbytne: true,
      analyticke: Boolean(data.analyticke ?? data.analytical ?? false),
      marketingove: Boolean(data.marketingove ?? data.marketing ?? false),
    };
  } catch {
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

  window.localStorage.setItem(KLIC_SOUHLASU, JSON.stringify(souhlas));
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
