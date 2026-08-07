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
}

export async function nacistProdukty(filtry: FiltryKatalogu = {}): Promise<VysledekKatalogu> {
  const stranka = Math.max(1, filtry.stranka ?? 1);

  const kde: Prisma.ProductWhereInput = {
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
    ...(filtry.hledat
      ? {
          OR: [
            { nazev: { contains: filtry.hledat, mode: 'insensitive' } },
            { popis: { contains: filtry.hledat, mode: 'insensitive' } },
            { znacka: { contains: filtry.hledat, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

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

  return {
    produkty: produkty.map(naVypis),
    celkem,
    stranka,
    stranek: Math.max(1, Math.ceil(celkem / PRODUKTU_NA_STRANKU)),
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
