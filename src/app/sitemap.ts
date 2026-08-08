import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

/**
 * Sitemap se generuje z databáze.
 *
 * Dřív tu byl pevný seznam, který mimo jiné odkazoval na `/produkty/saty`
 * a další kategorie – jenže routa `/produkty/[kategorie]` neexistovala,
 * takže Google dostával pět adres vracejících 404. A žádný produkt v mapě
 * naopak nebyl.
 */
/*
 * `force-dynamic` ze stejného důvodu jako u feedu: s revalidací by se sitemap
 * skládala už při buildu, kde databáze není k dispozici. Vyhledávače si ji
 * tahají zřídka, takže dotaz na požadavek je levnější než zastaralá mapa.
 */
export const dynamic = 'force-dynamic';

const STATICKE: Array<{ cesta: string; priorita: number; frekvence: 'daily' | 'weekly' | 'monthly' }> = [
  { cesta: '', priorita: 1.0, frekvence: 'daily' },
  { cesta: '/produkty', priorita: 0.9, frekvence: 'daily' },
  { cesta: '/o-mne', priorita: 0.6, frekvence: 'monthly' },
  { cesta: '/kontakt', priorita: 0.6, frekvence: 'monthly' },
  { cesta: '/doprava-a-platba', priorita: 0.5, frekvence: 'monthly' },
  { cesta: '/obchodni-podminky', priorita: 0.3, frekvence: 'monthly' },
  { cesta: '/ochrana-osobnich-udaju', priorita: 0.3, frekvence: 'monthly' },
  { cesta: '/cookies', priorita: 0.3, frekvence: 'monthly' },
  { cesta: '/reklamacni-rad', priorita: 0.3, frekvence: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ted = new Date();

  const zaznamy: MetadataRoute.Sitemap = STATICKE.map((s) => ({
    url: `${ZAKLADNI_URL}${s.cesta}`,
    lastModified: ted,
    changeFrequency: s.frekvence,
    priority: s.priorita,
  }));

  try {
    const [kategorie, produkty] = await Promise.all([
      // Prázdnou kategorii do mapy neposíláme – vede na prázdný výpis.
      db.category.findMany({
        where: { products: { some: { aktivni: true } } },
        select: { slug: true },
        orderBy: { poradi: 'asc' },
      }),
      db.product.findMany({
        where: { aktivni: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
    ]);

    for (const k of kategorie) {
      zaznamy.push({
        url: `${ZAKLADNI_URL}/produkty/${k.slug}`,
        lastModified: ted,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    for (const p of produkty) {
      zaznamy.push({
        url: `${ZAKLADNI_URL}/produkt/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (err) {
    // Nedostupná databáze nesmí shodit celou sitemap – statická část
    // je pořád lepší než chyba 500.
    console.error('[sitemap] Nepodařilo se načíst produkty:', err);
  }

  return zaznamy;
}
