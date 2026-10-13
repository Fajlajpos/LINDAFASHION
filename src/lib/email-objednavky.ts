/**
 * Obsah smlouvy pro potvrzovací e-mail objednávky.
 *
 * § 1822 o. z. (čl. 8 odst. 7 směrnice 2011/83/EU): prodávající potvrdí
 * uzavření smlouvy **v textové podobě**, s údaji podle § 1820 – co se kupuje,
 * celková cena včetně dopravy, kdo prodává, jak a kdy se dodává a platí.
 * E-mail dřív nesl jen „Celkem: 1 999 Kč"; z něj nešlo poznat, co si kupující
 * koupil, od koho, ani kam poslat peníze.
 *
 * Čistá funkce nad už uloženou objednávkou: ceny se berou z řádku v databázi
 * (`cenaVDobeNakupu`, snímek DPH a prodávajícího), nikdy z požadavku
 * a nikdy z dnešního `Settings` tam, kde objednávka nese vlastní snímek –
 * stejné pravidlo jako u faktury.
 */
import { precistSnimekDodavatele, snimekDodavatele, type SnimekDodavatele, type ZdrojDodavatele } from './dodavatel';

/** Část objednávky, kterou e-mail potřebuje (tvar z `db.order.findUnique`). */
export interface ObjednavkaProEmail {
  cisloObjednavky: string;
  zpusobPlatby: string;
  mezisoucet: unknown;
  slevaCastka: unknown;
  cenaDopravy: unknown;
  castkaZGiftCard: unknown;
  celkovaCena: unknown;
  jePlatceDph: boolean;
  sazbaDph: number;
  dphHaleru: number;
  dodaciJmenoPrijmeni: string;
  dodaciUlice: string;
  dodaciMesto: string;
  dodaciPsc: string;
  vydejniMistoNazev: string | null;
  dodavatelSnapshot: unknown;
  items: Array<{
    mnozstvi: number;
    cenaVDobeNakupu: unknown;
    variant: { velikost: string; product: { nazev: string } };
  }>;
}

export interface BankovniUdaje {
  cisloUctu: string | null;
  iban: string | null;
}

export interface ObsahEmailuObjednavky {
  polozky: Array<{ nazev: string; velikost: string; mnozstvi: number; celkemKc: number }>;
  mezisoucetKc: number;
  slevaKc: number;
  dopravaKc: number;
  zPoukazuKc: number;
  kUhradeKc: number;
  dph: { jePlatce: boolean; sazba: number; dphKc: number };
  dodani: { jmeno: string; adresa: string | null; vydejniMisto: string | null };
  platebniUdaje: { cisloUctu: string | null; iban: string | null; vs: string; castkaKc: number } | null;
  dodavatel: SnimekDodavatele;
}

/** Decimal z Prismy i obyčejné číslo → Kč, zaokrouhleno na haléře. */
function naKc(hodnota: unknown): number {
  const n = Number(hodnota ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function obsahEmailuObjednavky(
  objednavka: ObjednavkaProEmail,
  nastaveni: ZdrojDodavatele,
  banka: BankovniUdaje
): ObsahEmailuObjednavky {
  const celkem = naKc(objednavka.celkovaCena);
  const zPoukazu = naKc(objednavka.castkaZGiftCard);
  const kUhradeKc = Math.max(0, Math.round((celkem - zPoukazu) * 100) / 100);

  /*
   * Platební údaje jen u převodu, na který ještě něco zbývá. U karty platí
   * brána a u objednávky celé zaplacené poukazem by výzva k platbě byla
   * pozvánkou zaplatit dvakrát (stejné pravidlo jako na faktuře).
   */
  const maBanku = Boolean(banka.cisloUctu || banka.iban);
  const platebniUdaje =
    objednavka.zpusobPlatby === 'bankovni_prevod' && kUhradeKc > 0 && maBanku
      ? {
          cisloUctu: banka.cisloUctu,
          iban: banka.iban,
          // Stejný variabilní symbol jako na potvrzovací stránce a v QR kódu.
          vs: objednavka.cisloObjednavky.replace(/\D/g, ''),
          castkaKc: kUhradeKc,
        }
      : null;

  return {
    polozky: objednavka.items.map((i) => {
      const zaKus = naKc(i.cenaVDobeNakupu);
      return {
        nazev: i.variant.product.nazev,
        velikost: i.variant.velikost,
        mnozstvi: i.mnozstvi,
        celkemKc: Math.round(zaKus * i.mnozstvi * 100) / 100,
      };
    }),
    mezisoucetKc: naKc(objednavka.mezisoucet),
    slevaKc: naKc(objednavka.slevaCastka),
    dopravaKc: naKc(objednavka.cenaDopravy),
    zPoukazuKc: zPoukazu,
    kUhradeKc,
    dph: {
      jePlatce: objednavka.jePlatceDph,
      sazba: objednavka.sazbaDph,
      dphKc: objednavka.dphHaleru / 100,
    },
    dodani: {
      jmeno: objednavka.dodaciJmenoPrijmeni,
      vydejniMisto: objednavka.vydejniMistoNazev,
      // U výdejního místa adresa zákaznice nic nedoručuje – jen by mátla.
      adresa: objednavka.vydejniMistoNazev
        ? null
        : [objednavka.dodaciUlice, `${objednavka.dodaciPsc} ${objednavka.dodaciMesto}`.trim()]
            .filter((c) => c.trim() !== '')
            .join(', ') || null,
    },
    platebniUdaje,
    // Snímek z objednávky; starší objednávky bez něj padají na dnešní nastavení.
    dodavatel: precistSnimekDodavatele(objednavka.dodavatelSnapshot) ?? snimekDodavatele(nastaveni),
  };
}
