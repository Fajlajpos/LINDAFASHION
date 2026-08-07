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

export const ZAKLADNI_URL = process.env.APP_URL || 'https://lindafashion.cz';

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
    description: 'Butik s nadčasovou italskou dámskou módou.',
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
  if (!nastaveni.adresaFirmy) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: nastaveni.nazevFirmy || 'LINDA FASHION',
    url: ZAKLADNI_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: nastaveni.adresaFirmy,
      addressCountry: 'CZ',
    },
    ...(nastaveni.telefonFirmy ? { telephone: nastaveni.telefonFirmy } : {}),
    ...(nastaveni.emailFirmy ? { email: nastaveni.emailFirmy } : {}),
  };
}

export function produktLd(produkt: ProduktDetail) {
  const cena = produkt.cenaPoSleve ?? produkt.cena;
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
