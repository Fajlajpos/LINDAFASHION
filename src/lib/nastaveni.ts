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

  /** Údaj o zápisu v obchodním či živnostenském rejstříku (§ 435 o. z.). */
  zapisVRejstriku: string | null;

  /** Základní sazba DPH v procentech. Uplatňuje se jen u plátce. */
  sazbaDph: number;

  /** Adresa pro vracené zboží – bývá jiná než sídlo. */
  adresaProVraceni: string | null;

  /** Obvyklá doba dodání v pracovních dnech (§ 1820 odst. 1 písm. h o. z.). */
  dodaciLhutaDnu: number;

  /** Kontakt pro uplatnění práv subjektu údajů (čl. 13 GDPR). */
  emailProGdpr: string | null;

  /**
   * Verze obchodních podmínek. Zapisuje se ke každé objednávce – po změně
   * znění je nutné ji zvednout, jinak snímek u objednávky ukazuje na text,
   * který zákaznice nikdy neviděla.
   */
  verzePodminek: string;
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
  zapisVRejstriku: null,
  sazbaDph: 21,
  adresaProVraceni: null,
  dodaciLhutaDnu: 3,
  emailProGdpr: null,
  verzePodminek: '1',
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
      zapisVRejstriku: zaznam.zapisVRejstriku,
      sazbaDph: zaznam.sazbaDph,
      adresaProVraceni: zaznam.adresaProVraceni,
      dodaciLhutaDnu: zaznam.dodaciLhutaDnu,
      emailProGdpr: zaznam.emailProGdpr,
      verzePodminek: zaznam.verzePodminek,
    };
  } catch (err) {
    // Web nesmí spadnout kvůli nastavení – bez něj se prostě chová výchozím
    // způsobem (žádná dovolená, ceny dopravy z konstant).
    console.error('[nastavení] Nepodařilo se načíst, používám výchozí:', err);
    return VYCHOZI_NASTAVENI;
  }
});

/**
 * Věta o DPH u ceny (sekce 11).
 *
 * Přepínač „plátce DPH" v administraci se do téhle chvíle propisoval jen na
 * fakturu – na webu se ceny popisovaly stejně v obou případech. Neplátce
 * přitom DPH uvádět nesmí a plátce ji u ceny uvést musí.
 */
export function popisDph(nastaveni: NastaveniWebu): string {
  return nastaveni.jePlatceDph
    ? `Ceny jsou uvedené včetně DPH ${nastaveni.sazbaDph} %.`
    : 'Nejsme plátci DPH.';
}

/**
 * Rozpad koncové částky na základ daně a DPH.
 *
 * Ceny v e-shopu jsou vždy **včetně** daně, takže se DPH počítá shora:
 * `daň = celkem − celkem / (1 + sazba/100)`. Počítat `celkem × sazba` je
 * klasická záměna, která u 21 % přehodí daň o pětinu nahoru.
 *
 * Neplátce má nulu – DPH na dokladu uvádět nesmí.
 */
export function dphZCelkem(celkemHaleru: number, nastaveni: NastaveniWebu): number {
  if (!nastaveni.jePlatceDph || nastaveni.sazbaDph <= 0) return 0;

  const zaklad = Math.round(celkemHaleru / (1 + nastaveni.sazbaDph / 100));
  return celkemHaleru - zaklad;
}

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

/**
 * Věta o době dodání – § 1820 odst. 1 písm. h) o. z.
 *
 * Dobu dodání musí prodávající sdělit **před** uzavřením smlouvy, a na webu
 * nebyla nikde. Věta se skládá tady, na jednom místě: detail produktu,
 * pokladna i obchodní podmínky by si ji jinak formulovaly každý po svém
 * a zákaznice by ze tří míst dostala tři různé sliby.
 *
 * Režim dovolené má přednost. Slibovat „do tří pracovních dnů", když
 * majitelka nebalí, je horší než mlčet – z informační povinnosti by se stala
 * nepravdivá informace.
 */
export function popisDodaciLhuty(nastaveni: NastaveniWebu): string {
  if (nastaveni.rezimDovolene) {
    const datum = nastaveni.datumNavratu
      ? nastaveni.datumNavratu.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })
      : null;

    return datum
      ? `Kvůli dovolené odesíláme objednávky až od ${datum}.`
      : 'Kvůli dovolené odesíláme objednávky až po návratu.';
  }

  // Po „do" stojí genitiv: jednotné „1 pracovního dne", množné „5 pracovních dnů".
  const dnu = nastaveni.dodaciLhutaDnu;
  const jednotka = dnu === 1 ? 'pracovního dne' : 'pracovních dnů';

  return `Zboží skladem odesíláme do ${dnu} ${jednotka} od přijetí platby.`;
}
