/**
 * Adresa stránky bez jednorázových klíčů – pro měřicí skripty.
 *
 * GA4 i Meta Pixel posílají s každou událostí celou URL. Na stránkách jako
 * `/pokladna/potvrzeni?t=…`, `/odstoupeni?token=…` nebo `/zmena-emailu?t=…`
 * je v ní klíč, který bez přihlášení otevírá jméno, adresu, fakturu nebo
 * potvrzení – a ten by skončil u Googlu a Mety.
 *
 * Hodnota se nahradí, parametr zůstává: v měření je pořád vidět, že šlo
 * o stránku s odkazem z e-mailu, jen bez klíče.
 */
const CITLIVE_PARAMETRY = ['t', 'token'] as const;
const NAHRADA = 'skryto';

export function ocistitAdresu(href: string): string {
  if (!href) return href;

  try {
    const url = new URL(href);
    let zmeneno = false;

    for (const nazev of CITLIVE_PARAMETRY) {
      if (url.searchParams.has(nazev)) {
        url.searchParams.set(nazev, NAHRADA);
        zmeneno = true;
      }
    }

    return zmeneno ? url.toString() : href;
  } catch {
    // Nečitelná adresa – raději nic než něco s klíčem uvnitř.
    return '';
  }
}

/** Nese adresa jednorázový klíč? Na takové stránce Pixel nic neodešle. */
export function obsahujeCitlivyParametr(href: string): boolean {
  try {
    const url = new URL(href);
    return CITLIVE_PARAMETRY.some((nazev) => url.searchParams.has(nazev));
  } catch {
    return true;
  }
}
