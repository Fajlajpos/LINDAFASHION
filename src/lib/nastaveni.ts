/**
 * Nastavení e-shopu (tabulka `Settings`, sekce 6.7 a 6.8 zadání).
 *
 * Firemní údaje, kontakty, odkazy na sociální sítě, ceny dopravy a režim
 * dovolené žijí v databázi, ne v `.env` – majitelka je musí umět změnit
 * z administrace bez zásahu do kódu a bez nasazování.
 *
 * Do téhle chvíle tabulku nikdo nečetl ani nezapisoval; admin stránka byla
 * maketa nad `useState`, takže režim dovolené ani ceny dopravy nic nedělaly.
 */
import { cache } from 'react';
import { db } from './db';

export interface NastaveniWebu {
  rezimDovolene: boolean;
  datumNavratu: Date | null;
  zpravaProZakazniky: string | null;
  zablokovatObjednavky: boolean;

  nazevFirmy: string | null;
  icoFirmy: string | null;
  dicFirmy: string | null;
  adresaFirmy: string | null;
  telefonFirmy: string | null;
  emailFirmy: string | null;
  jePlatceDph: boolean;

  socialInstagram: string | null;
  socialFacebook: string | null;

  cenaDopravyZasilkovna: number | null;
  cenaDopravyPPL: number | null;
  cenaDopravyCeskaPosta: number | null;
  prahDopravaZdarma: number | null;
}

export const VYCHOZI_NASTAVENI: NastaveniWebu = {
  rezimDovolene: false,
  datumNavratu: null,
  zpravaProZakazniky: null,
  zablokovatObjednavky: false,
  nazevFirmy: null,
  icoFirmy: null,
  dicFirmy: null,
  adresaFirmy: null,
  telefonFirmy: null,
  emailFirmy: null,
  jePlatceDph: false,
  socialInstagram: null,
  socialFacebook: null,
  cenaDopravyZasilkovna: null,
  cenaDopravyPPL: null,
  cenaDopravyCeskaPosta: null,
  prahDopravaZdarma: null,
};

/** V tabulce je vždy nejvýš jeden řádek – drží ho pevné id. */
export const ID_NASTAVENI = 1;

/**
 * `cache()` z Reactu: během jednoho požadavku se dotaz provede jen jednou,
 * i když si nastavení vyžádá layout, hlavička i pokladna zvlášť.
 */
export const nacistNastaveni = cache(async (): Promise<NastaveniWebu> => {
  try {
    const zaznam = await db.settings.findUnique({ where: { id: ID_NASTAVENI } });
    if (!zaznam) return VYCHOZI_NASTAVENI;

    return {
      rezimDovolene: zaznam.rezimDovolene,
      datumNavratu: zaznam.datumNavratu,
      zpravaProZakazniky: zaznam.zpravaProZakazniky,
      zablokovatObjednavky: zaznam.zablokovatObjednavky,
      nazevFirmy: zaznam.nazevFirmy,
      icoFirmy: zaznam.icoFirmy,
      dicFirmy: zaznam.dicFirmy,
      adresaFirmy: zaznam.adresaFirmy,
      telefonFirmy: zaznam.telefonFirmy,
      emailFirmy: zaznam.emailFirmy,
      jePlatceDph: zaznam.jePlatceDph,
      socialInstagram: zaznam.socialInstagram,
      socialFacebook: zaznam.socialFacebook,
      cenaDopravyZasilkovna: zaznam.cenaDopravyZasilkovna === null ? null : Number(zaznam.cenaDopravyZasilkovna),
      cenaDopravyPPL: zaznam.cenaDopravyPPL === null ? null : Number(zaznam.cenaDopravyPPL),
      cenaDopravyCeskaPosta: zaznam.cenaDopravyCeskaPosta === null ? null : Number(zaznam.cenaDopravyCeskaPosta),
      prahDopravaZdarma: zaznam.prahDopravaZdarma === null ? null : Number(zaznam.prahDopravaZdarma),
    };
  } catch (err) {
    // Web nesmí spadnout kvůli nastavení – bez něj se prostě chová výchozím
    // způsobem (žádná dovolená, ceny dopravy z konstant).
    console.error('[nastavení] Nepodařilo se načíst, používám výchozí:', err);
    return VYCHOZI_NASTAVENI;
  }
});

/**
 * Text banneru dovolené s doplněným datem návratu.
 * Zástupný symbol `{datum}` je popsaný v zadání (sekce 6.7).
 */
export function zpravaODovolene(nastaveni: NastaveniWebu): string | null {
  if (!nastaveni.rezimDovolene) return null;

  const datum = nastaveni.datumNavratu
    ? nastaveni.datumNavratu.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const sablona =
    nastaveni.zpravaProZakazniky?.trim() ||
    (datum
      ? 'Momentálně čerpáme dovolenou, objednávky budeme opět expedovat od {datum}.'
      : 'Momentálně čerpáme dovolenou. Objednávky odešleme hned po návratu.');

  return sablona.replace('{datum}', datum ?? 'našeho návratu');
}
