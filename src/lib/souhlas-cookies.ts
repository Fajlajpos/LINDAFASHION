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
