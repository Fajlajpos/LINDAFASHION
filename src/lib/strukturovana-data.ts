/**
 * Strukturovaná data schema.org (sekce 12 zadání).
 *
 * V projektu do téhle chvíle nebyl ani jeden `application/ld+json`, takže
 * vyhledávače ani AI asistenti neměli z čeho vyčíst cenu, dostupnost nebo
 * zařazení produktu.
 *
 * Vše vrací prosté objekty; vykreslení řeší komponenta `<JsonLd />`.
 */
import type { ProduktDetail } from './katalog';
import type { NastaveniWebu } from './nastaveni';
import { odkazNaMapu, oteviraciDobaProSchema, rozlozitAdresu } from './prodejna';
import { adresaWebu } from './adresa-webu';
import { dostupneDopravy } from './shipping';
import { DNU_NA_ODSTOUPENI } from './lhuty';

export const ZAKLADNI_URL = adresaWebu('https://lindafashion.cz');

function absolutni(cesta: string): string {
  return cesta.startsWith('http') ? cesta : `${ZAKLADNI_URL}${cesta}`;
}

export function organizaceLd(nastaveni: NastaveniWebu) {
  const site = [nastaveni.socialInstagram, nastaveni.socialFacebook].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: nastaveni.nazevFirmy || 'LINDA FASHION',
    url: ZAKLADNI_URL,
    description: 'Butik s nadčasovou dámskou módou v italském stylu.',
    ...(site.length ? { sameAs: site } : {}),
    ...(nastaveni.emailFirmy || nastaveni.telefonFirmy
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(nastaveni.emailFirmy ? { email: nastaveni.emailFirmy } : {}),
            ...(nastaveni.telefonFirmy ? { telephone: nastaveni.telefonFirmy } : {}),
            areaServed: 'CZ',
            availableLanguage: 'Czech',
          },
        }
      : {}),
  };
}

/**
 * LocalBusiness pro lokální SEO (sekce 12, „GEO").
 * Vrací `null`, dokud majitelka nevyplní adresu – neúplný záznam je horší
 * než žádný, Google ho označí za chybný.
 */
export function mistniProvozovnaLd(nastaveni: NastaveniWebu) {
  /*
   * Adresa provozovny, ne sídla. `ClothingStore` říká Googlu „tady je obchod,
   * sem pošli zákaznice" – a sídlo je u podnikající fyzické osoby zpravidla
   * bydliště. Dokud se tu četla `adresaFirmy`, mapa mířila k majitelce domů.
   * Sídlo zůstává záložní hodnotou pro obchod, který provozovnu nemá zvlášť.
   */
  const adresa = nastaveni.adresaProvozovny ?? nastaveni.adresaFirmy;
  if (!adresa) return null;

  /*
   * Adresa rozložená na ulici, PSČ a město. Celý řádek v `streetAddress`
   * (i s názvem obchodu a PSČ) Google pro místní výsledky čte hůř – „Sokolov"
   * má být `addressLocality`, ne konec názvu ulice.
   *
   * `openingHours` jen tehdy, když otevírací dobu z administrace přečteme celou.
   * Zkomolená doba v mapách je horší než žádná.
   */
  const rozlozena = rozlozitAdresu(adresa);
  const oteviraciDoba = oteviraciDobaProSchema(nastaveni.oteviraciDoba);
  const mapa = odkazNaMapu(adresa);

  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: nastaveni.nazevFirmy || 'LINDA FASHION',
    url: ZAKLADNI_URL,
    description:
      'Kamenná prodejna butiku LINDA FASHION s dámskou módou. Výběr se liší od e-shopu – najdete tu i kousky, které online nejsou.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: rozlozena?.ulice ?? adresa,
      ...(rozlozena?.psc ? { postalCode: rozlozena.psc } : {}),
      ...(rozlozena?.mesto ? { addressLocality: rozlozena.mesto } : {}),
      addressCountry: 'CZ',
    },
    ...(oteviraciDoba ? { openingHours: oteviraciDoba } : {}),
    ...(mapa ? { hasMap: mapa } : {}),
    ...(nastaveni.telefonFirmy ? { telephone: nastaveni.telefonFirmy } : {}),
    ...(nastaveni.emailFirmy ? { email: nastaveni.emailFirmy } : {}),
  };
}

/**
 * Doprava pro Google Merchant listings (`shippingDetails`).
 *
 * Ceny jdou z `dostupneDopravy()` – stejný zdroj jako pokladna, takže
 * výsledky hledání nemohou slibovat jinou cenu, než se naúčtuje. Bez
 * nastavené dopravy se pole vynechá: neuvedená cena je lepší než vymyšlená.
 * Doba přepravy 1–2 dny je obvyklá doba českých dopravců po předání
 * zásilky; vlastní lhůtu odeslání bere z `dodaciLhutaDnu`.
 */
function dopravaLd(cena: number, nastaveni: NastaveniWebu) {
  const prah = nastaveni.prahDopravaZdarma;
  const zdarma = prah != null && cena >= prah;

  return dostupneDopravy(nastaveni).map((d) => ({
    '@type': 'OfferShippingDetails',
    shippingLabel: d.nazev,
    shippingRate: { '@type': 'MonetaryAmount', value: (zdarma ? 0 : d.cena).toFixed(2), currency: 'CZK' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CZ' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: nastaveni.dodaciLhutaDnu, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
    },
  }));
}

/**
 * Vrácení zboží (`hasMerchantReturnPolicy`) – 14 dní od převzetí (§ 1829),
 * poštou, náklady na vrácení nese kupující (obchodní podmínky).
 */
function vraceniLd() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'CZ',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: DNU_NA_ODSTOUPENI,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    merchantReturnLink: absolutni('/odstoupeni'),
  };
}

export function produktLd(produkt: ProduktDetail, nastaveni: NastaveniWebu) {
  const cena = produkt.cenaPoSleve ?? produkt.cena;
  const doprava = dopravaLd(cena, nastaveni);
  const dostupnost =
    produkt.sklademCelkem > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produkt.nazev,
    description: produkt.popis.slice(0, 500),
    sku: produkt.sku ?? undefined,
    ...(produkt.znacka ? { brand: { '@type': 'Brand', name: produkt.znacka } } : {}),
    ...(produkt.material ? { material: produkt.material } : {}),
    // Země původu přímo do dat pro vyhledávače a AI asistenty – u kousku
    // z Itálie je to nejsilnější a přitom doložitelný signál „italská móda".
    ...(produkt.zemePuvodu
      ? { countryOfOrigin: { '@type': 'Country', name: produkt.zemePuvodu } }
      : {}),
    category: produkt.kategorieNazev,
    ...(produkt.fotky.length ? { image: produkt.fotky.map((f) => absolutni(f.url)) } : {}),
    offers: {
      '@type': 'Offer',
      url: absolutni(`/produkt/${produkt.slug}`),
      priceCurrency: 'CZK',
      price: cena.toFixed(2),
      availability: dostupnost,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'LINDA FASHION' },
      ...(doprava.length ? { shippingDetails: doprava } : {}),
      hasMerchantReturnPolicy: vraceniLd(),
    },
  };
}

export interface DrobeckovaPolozka {
  nazev: string;
  cesta: string;
}

export function drobeckyLd(polozky: DrobeckovaPolozka[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: polozky.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nazev,
      item: absolutni(p.cesta),
    })),
  };
}

export interface Otazka {
  otazka: string;
  odpoved: string;
}

/** FAQPage – pomáhá i generativním vyhledávačům (sekce 12, „GEO"). */
export function faqLd(otazky: Otazka[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: otazky.map((o) => ({
      '@type': 'Question',
      name: o.otazka,
      acceptedAnswer: { '@type': 'Answer', text: o.odpoved },
    })),
  };
}
