/**
 * Dotazy nad katalogem pro veřejnou část webu.
 *
 * Jedno místo pro všechny výpisy produktů – katalog, kategorie, detail,
 * homepage, feed i sitemap. Díky tomu se pravidlo „zákaznice vidí jen aktivní
 * produkty" nedá nikde omylem obejít.
 */
import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { normalizovat, podminkaHledani, rozlozitDotaz } from './vyhledavani';

export type Razeni = 'nejnovejsi' | 'cena-vzestupne' | 'cena-sestupne' | 'nazev';

export interface FiltryKatalogu {
  kategorie?: string | null;
  velikost?: string | null;
  cenaOd?: number | null;
  cenaDo?: number | null;
  hledat?: string | null;
  razeni?: Razeni;
  stranka?: number;
}

export interface ProduktVypis {
  id: string;
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve: number | null;
  znacka: string | null;
  kategorieNazev: string;
  kategorieSlug: string;
  obrazekUrl: string | null;
  obrazekAlt: string | null;
  doporuceny: boolean;
  jeDarkovyPoukaz: boolean;
  sklademCelkem: number;
  velikosti: string[];
}

export const PRODUKTU_NA_STRANKU = 12;

/** Jen aktivní produkty – tohle je jediná brána pro veřejnou část. */
const VEREJNE: Prisma.ProductWhereInput = { aktivni: true };

function razeniNaOrderBy(razeni: Razeni = 'nejnovejsi'): Prisma.ProductOrderByWithRelationInput[] {
  switch (razeni) {
    case 'cena-vzestupne':
      return [{ cena: 'asc' }, { nazev: 'asc' }];
    case 'cena-sestupne':
      return [{ cena: 'desc' }, { nazev: 'asc' }];
    case 'nazev':
      return [{ nazev: 'asc' }];
    default:
      // Doporučené kousky napřed, pak podle novosti.
      return [{ doporuceny: 'desc' }, { createdAt: 'desc' }];
  }
}

function naVypis(p: {
  id: string;
  nazev: string;
  slug: string;
  cena: Prisma.Decimal;
  cenaPoSleve: Prisma.Decimal | null;
  znacka: string | null;
  doporuceny: boolean;
  jeDarkovyPoukaz: boolean;
  category: { nazev: string; slug: string };
  variants: { velikost: string; skladem: number }[];
  images: { urlMedium: string | null; altText: string | null }[];
}): ProduktVypis {
  return {
    id: p.id,
    nazev: p.nazev,
    slug: p.slug,
    cena: Number(p.cena),
    cenaPoSleve: p.cenaPoSleve === null ? null : Number(p.cenaPoSleve),
    znacka: p.znacka,
    kategorieNazev: p.category.nazev,
    kategorieSlug: p.category.slug,
    // Fotka, která ještě není zpracovaná, má `urlMedium` null – karta pak
    // vykreslí značkovou ilustraci místo rozbitého obrázku.
    obrazekUrl: p.images[0]?.urlMedium ?? null,
    obrazekAlt: p.images[0]?.altText ?? null,
    doporuceny: p.doporuceny,
    jeDarkovyPoukaz: p.jeDarkovyPoukaz,
    sklademCelkem: p.variants.reduce((s, v) => s + v.skladem, 0),
    velikosti: p.variants.map((v) => v.velikost),
  };
}

const VYBER_VYPIS = {
  id: true,
  nazev: true,
  slug: true,
  cena: true,
  cenaPoSleve: true,
  znacka: true,
  doporuceny: true,
  jeDarkovyPoukaz: true,
  category: { select: { nazev: true, slug: true } },
  variants: { select: { velikost: true, skladem: true } },
  images: {
    where: { stavZpracovani: 'HOTOVO' as const },
    orderBy: [{ jeHlavni: 'desc' as const }, { poradi: 'asc' as const }],
    take: 1,
    select: { urlMedium: true, altText: true },
  },
} satisfies Prisma.ProductSelect;

export interface VysledekKatalogu {
  produkty: ProduktVypis[];
  celkem: number;
  stranka: number;
  stranek: number;
  /**
   * Výsledky pocházejí z uvolněného hledání – na všechna zadaná slova
   * nesedělo nic, tohle jsou kousky odpovídající aspoň jednomu. Výpis to
   * musí říct nahlas, jinak se tváří, že přesnou shodu našel.
   */
  volnaShoda: boolean;
}

/** Filtry mimo hledání – ty platí v přísném i v uvolněném průchodu stejně. */
function podminkaFiltru(filtry: FiltryKatalogu): Prisma.ProductWhereInput {
  return {
    ...VEREJNE,
    ...(filtry.kategorie
      ? {
          // Vybraná kategorie i její podkategorie (Šaty → Letní šaty).
          category: {
            OR: [{ slug: filtry.kategorie }, { parent: { slug: filtry.kategorie } }],
          },
        }
      : {}),
    ...(filtry.velikost ? { variants: { some: { velikost: filtry.velikost, skladem: { gt: 0 } } } } : {}),
    ...(filtry.cenaOd != null || filtry.cenaDo != null
      ? {
          cena: {
            ...(filtry.cenaOd != null ? { gte: new Prisma.Decimal(filtry.cenaOd) } : {}),
            ...(filtry.cenaDo != null ? { lte: new Prisma.Decimal(filtry.cenaDo) } : {}),
          },
        }
      : {}),
  };
}

/**
 * Filtr kategorie a hledání se spojují **vnořeně, ne sloučením klíčů**.
 *
 * Obě části potřebují `category` (jedna vybranou kategorii, druhá shodu
 * v jejím názvu) a obě používají `OR`. Rozprostřít je do jednoho objektu
 * znamená, že druhý klíč přepíše první: na `/produkty/saty?hledat=len` by
 * se filtr kategorie tiše ztratil a hledalo by se v celém katalogu.
 * `AND` drží obě podmínky vedle sebe, ať mají uvnitř cokoli.
 */
function spojit(
  zaklad: Prisma.ProductWhereInput,
  hledani: Prisma.ProductWhereInput | null
): Prisma.ProductWhereInput {
  return hledani ? { AND: [zaklad, hledani] } : zaklad;
}

export async function nacistProdukty(filtry: FiltryKatalogu = {}): Promise<VysledekKatalogu> {
  const stranka = Math.max(1, filtry.stranka ?? 1);
  const tokeny = filtry.hledat ? rozlozitDotaz(filtry.hledat) : [];
  const zaklad = podminkaFiltru(filtry);

  const nacistStranku = async (volne: boolean) => {
    const kde = spojit(zaklad, podminkaHledani(tokeny, volne));

    const [produkty, celkem] = await Promise.all([
      db.product.findMany({
        where: kde,
        orderBy: razeniNaOrderBy(filtry.razeni),
        skip: (stranka - 1) * PRODUKTU_NA_STRANKU,
        take: PRODUKTU_NA_STRANKU,
        select: VYBER_VYPIS,
      }),
      db.product.count({ where: kde }),
    ]);

    return { produkty, celkem };
  };

  let { produkty, celkem } = await nacistStranku(false);
  let volnaShoda = false;

  /* Druhý pokus jen u víceslovného dotazu, který nenašel nic.
     Jednoslovný dotaz má obě varianty totožné, takže by šlo o stejný dotaz
     podruhé; u víceslovného je tohle rozdíl mezi „Nic jsme nenašli" a
     nabídkou nejbližších kousků. */
  if (celkem === 0 && tokeny.length > 1) {
    ({ produkty, celkem } = await nacistStranku(true));
    volnaShoda = celkem > 0;
  }

  return {
    produkty: produkty.map(naVypis),
    celkem,
    stranka,
    stranek: Math.max(1, Math.ceil(celkem / PRODUKTU_NA_STRANKU)),
    volnaShoda,
  };
}

export interface NavrhProduktu {
  id: string;
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve: number | null;
  kategorieNazev: string;
  obrazekUrl: string | null;
}

export interface VysledekNaseptavace {
  produkty: NavrhProduktu[];
  kategorie: Array<{ nazev: string; slug: string }>;
  /** Kolik kousků dotazu odpovídá celkem – pro řádek „zobrazit vše". */
  celkem: number;
  volnaShoda: boolean;
}

/** Kolik návrhů se vejde do rozbaleného seznamu, aniž by přerostl obrazovku. */
const NAVRHU = 6;

/**
 * Kolik kousků si vytáhnout k seřazení podle relevance.
 *
 * Databáze umí jen „obsahuje", ne „obsahuje kde". Vezmeme proto širší hrst
 * a pořadí dorovnáme v paměti; při této velikosti je to jeden dotaz a pár
 * porovnání řetězců.
 */
const NAVRHU_K_SERAZENI = 24;

/**
 * Kde se slovo trefilo, tolik váží.
 *
 * Bez tohohle rozhodovalo `doporuceny` a stáří, takže dotaz „kašmír" nabídl
 * jako první vlněný kabát – v jeho popisu stojí „s příměsí kašmíru“, kdežto
 * „Kašmírový svetr Roma“ to slovo má rovnou v názvu. U našeptávače se přitom
 * čte hlavně první řádek; špatné pořadí je tam skoro totéž co špatný výsledek.
 */
function skoreNavrhu(
  produkt: { nazev: string; znacka: string | null; category: { nazev: string } },
  tokeny: string[]
): number {
  const nazev = normalizovat(produkt.nazev);
  const znacka = normalizovat(produkt.znacka ?? '');
  const kategorie = normalizovat(produkt.category.nazev);

  return tokeny.reduce((soucet, token) => {
    if (nazev.includes(token)) return soucet + 4;
    if (znacka.includes(token)) return soucet + 3;
    if (kategorie.includes(token)) return soucet + 2;
    // Shoda v popisu nebo materiálu – proto se sem produkt dostal.
    return soucet + 1;
  }, 0);
}

/**
 * Napovídání při psaní.
 *
 * Sdílí `podminkaHledani` s katalogem schválně: seznam, který nabídne kousek,
 * a stránka, která se otevře po odeslání, musí odpovídat stejnému dotazu.
 * Dvě samostatné implementace by se sešly u nejhoršího možného výsledku –
 * našeptávač ukáže šaty, zákaznice stiskne Enter a dostane „Nic jsme
 * nenašli".
 */
export async function nacistNaseptavac(dotaz: string): Promise<VysledekNaseptavace> {
  const tokeny = rozlozitDotaz(dotaz);
  if (tokeny.length === 0) {
    return { produkty: [], kategorie: [], celkem: 0, volnaShoda: false };
  }

  const najit = async (volne: boolean) => {
    const kde = spojit(VEREJNE, podminkaHledani(tokeny, volne));

    const [produkty, celkem] = await Promise.all([
      db.product.findMany({
        where: kde,
        // Doporučené napřed; u stejného skóre pak rozhodne tohle pořadí,
        // protože `sort` v JS je stabilní.
        orderBy: [{ doporuceny: 'desc' }, { createdAt: 'desc' }],
        take: NAVRHU_K_SERAZENI,
        select: VYBER_VYPIS,
      }),
      db.product.count({ where: kde }),
    ]);

    const serazene = [...produkty]
      .sort((a, b) => skoreNavrhu(b, tokeny) - skoreNavrhu(a, tokeny))
      .slice(0, NAVRHU);

    return { produkty: serazene, celkem };
  };

  let { produkty, celkem } = await najit(false);
  let volnaShoda = false;

  if (celkem === 0 && tokeny.length > 1) {
    ({ produkty, celkem } = await najit(true));
    volnaShoda = celkem > 0;
  }

  /* Kategorie bereme z už načteného (a v rámci požadavku cachovaného) stromu,
     ne dalším dotazem – je jich pár a filtr nad polem je levnější než další
     cesta do databáze. */
  const vsechnyKategorie = await nacistKategorie();
  const kategorie = vsechnyKategorie
    .filter((k) => k.pocetProduktu > 0 && tokeny.some((t) => k.hledaciNazev.includes(t)))
    .slice(0, 3)
    .map((k) => ({ nazev: k.nazev, slug: k.slug }));

  return {
    produkty: produkty.map((p) => {
      const v = naVypis(p);
      return {
        id: v.id,
        nazev: v.nazev,
        slug: v.slug,
        cena: v.cena,
        cenaPoSleve: v.cenaPoSleve,
        kategorieNazev: v.kategorieNazev,
        obrazekUrl: v.obrazekUrl,
      };
    }),
    kategorie,
    celkem,
    volnaShoda,
  };
}

export interface Miry {
  obvodHrudniku?: string | null;
  obvodPasu?: string | null;
  obvodBoku?: string | null;
  delka?: string | null;
  rukav?: string | null;
}

export interface ProduktDetail extends ProduktVypis {
  popis: string;
  material: string | null;
  udrzba: string | null;
  sku: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  varianty: Array<{
    id: string;
    velikost: string;
    barva: string | null;
    skladem: number;
    miry: Miry | null;
  }>;
  fotky: Array<{ id: string; url: string; sirka: number | null; vyska: number | null; alt: string | null }>;
  kategorieRodicNazev: string | null;
  kategorieRodicSlug: string | null;
}

export const nacistProdukt = cache(async (slug: string): Promise<ProduktDetail | null> => {
  const p = await db.product.findFirst({
    where: { slug, ...VEREJNE },
    include: {
      category: { include: { parent: { select: { nazev: true, slug: true } } } },
      variants: { orderBy: { velikost: 'asc' } },
      images: {
        where: { stavZpracovani: 'HOTOVO' },
        orderBy: [{ jeHlavni: 'desc' }, { poradi: 'asc' }],
      },
    },
  });

  if (!p) return null;

  return {
    ...naVypis({
      ...p,
      images: p.images.map((o) => ({ urlMedium: o.urlMedium, altText: o.altText })),
    }),
    popis: p.popis,
    material: p.material,
    udrzba: p.udrzba,
    sku: p.sku,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    createdAt: p.createdAt,
    varianty: p.variants.map((v) => ({
      id: v.id,
      velikost: v.velikost,
      barva: v.barva,
      skladem: v.skladem,
      miry: (v.miry as Miry | null) ?? null,
    })),
    fotky: p.images
      .filter((o): o is typeof o & { url: string } => o.url !== null)
      .map((o) => ({ id: o.id, url: o.url, sirka: o.sirka, vyska: o.vyska, alt: o.altText })),
    kategorieRodicNazev: p.category.parent?.nazev ?? null,
    kategorieRodicSlug: p.category.parent?.slug ?? null,
  };
});

/** Podobné produkty ze stejné kategorie (sekce 14). */
export async function nacistPodobne(produkt: ProduktDetail, kolik = 4): Promise<ProduktVypis[]> {
  const produkty = await db.product.findMany({
    where: {
      ...VEREJNE,
      category: { slug: produkt.kategorieSlug },
      NOT: { id: produkt.id },
    },
    orderBy: [{ doporuceny: 'desc' }, { createdAt: 'desc' }],
    take: kolik,
    select: VYBER_VYPIS,
  });

  return produkty.map(naVypis);
}

export async function nacistDoporucene(kolik = 8): Promise<ProduktVypis[]> {
  const produkty = await db.product.findMany({
    where: { ...VEREJNE, doporuceny: true },
    orderBy: { createdAt: 'desc' },
    take: kolik,
    select: VYBER_VYPIS,
  });

  return produkty.map(naVypis);
}

export interface KategorieVypis {
  id: string;
  nazev: string;
  slug: string;
  popis: string | null;
  parentSlug: string | null;
  pocetProduktu: number;
  /** Název bez diakritiky – aby našeptávač nemusel normalizovat znovu. */
  hledaciNazev: string;
}

/** Kategorie, ve kterých je aspoň jeden aktivní produkt. */
export const nacistKategorie = cache(async (): Promise<KategorieVypis[]> => {
  const kategorie = await db.category.findMany({
    orderBy: [{ poradi: 'asc' }, { nazev: 'asc' }],
    include: {
      parent: { select: { slug: true } },
      _count: { select: { products: { where: VEREJNE } } },
    },
  });

  return kategorie.map((k) => ({
    id: k.id,
    nazev: k.nazev,
    slug: k.slug,
    popis: k.popis,
    parentSlug: k.parent?.slug ?? null,
    pocetProduktu: k._count.products,
    hledaciNazev: k.hledaciNazev,
  }));
});

export const nacistKategorii = cache(async (slug: string) => {
  return db.category.findUnique({
    where: { slug },
    include: { parent: { select: { nazev: true, slug: true } } },
  });
});

/** Velikosti dostupné napříč katalogem – pro filtr v katalogu. */
export const nacistVelikosti = cache(async (): Promise<string[]> => {
  const varianty = await db.productVariant.findMany({
    where: { product: VEREJNE, skladem: { gt: 0 } },
    select: { velikost: true },
    distinct: ['velikost'],
    orderBy: { velikost: 'asc' },
  });

  return varianty.map((v) => v.velikost);
});
