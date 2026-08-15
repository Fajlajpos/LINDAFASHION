import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/shop/ProductCard';
import { DetailProduktu } from '@/components/shop/DetailProduktu';
import { JsonLd } from '@/components/shop/JsonLd';
import { KostraMrizky } from '@/components/ui/Kostra';
import { nacistPodobne, nacistProdukt, type ProduktDetail } from '@/lib/katalog';
import { nacistNastaveni, popisDph } from '@/lib/nastaveni';
import { drobeckyLd, produktLd } from '@/lib/strukturovana-data';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const produkt = await nacistProdukt(params.slug);

  if (!produkt) {
    return { title: 'Produkt nenalezen | LINDA FASHION' };
  }

  // Admin může meta údaje přepsat v editaci produktu (sekce 6.2).
  const titulek = produkt.metaTitle?.trim() || `${produkt.nazev} | LINDA FASHION`;
  const popis =
    produkt.metaDescription?.trim() || produkt.popis.replace(/\s+/g, ' ').slice(0, 160);

  return {
    title: titulek,
    description: popis,
    alternates: { canonical: `/produkt/${produkt.slug}` },
    openGraph: {
      title: titulek,
      description: popis,
      type: 'website',
      url: `/produkt/${produkt.slug}`,
      images: produkt.fotky.length ? [{ url: produkt.fotky[0].url }] : undefined,
    },
  };
}

/**
 * Podobné kousky se streamují zvlášť.
 *
 * Je to doplněk pod ohybem – dokud se načítal spolu se zbytkem, čekala na
 * jeho dotaz i galerie a výběr velikosti, tedy jediné, kvůli čemu zákaznice
 * na stránku přišla. Ve vlastní `Suspense` hranici odejde hlavní obsah hned
 * a mřížka doteče, až bude.
 */
function SekcePodobnych({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-6 border-t border-linda-sand/60 pt-12">
      <h2 className="font-serif text-2xl text-linda-espresso sm:text-3xl">Mohlo by se hodit</h2>
      {children}
    </section>
  );
}

async function PodobneProdukty({ produkt }: { produkt: ProduktDetail }) {
  const podobne = await nacistPodobne(produkt);
  // Poslední kousek v kategorii nemá k čemu odkazovat – nadpis nad prázdnou
  // mřížkou by jen zbyl. Sekci proto vynecháme celou, stejně jako dřív.
  if (podobne.length === 0) return null;

  return (
    <SekcePodobnych>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {podobne.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
    </SekcePodobnych>
  );
}

export default async function DetailProduktPage({ params }: Props) {
  // Nastavení běží souběžně s produktem – nezávisí na něm a sériově by jen
  // přidalo další čekání na databázi.
  const [produkt, nastaveni] = await Promise.all([nacistProdukt(params.slug), nacistNastaveni()]);
  if (!produkt) notFound();

  const drobecky = [
    { nazev: 'Domů', cesta: '/' },
    { nazev: 'Katalog', cesta: '/produkty' },
    { nazev: produkt.kategorieNazev, cesta: `/produkty/${produkt.kategorieSlug}` },
    { nazev: produkt.nazev, cesta: `/produkt/${produkt.slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Strukturovaná data pro vyhledávače a AI asistenty (sekce 12). */}
      <JsonLd data={produktLd(produkt)} />
      <JsonLd data={drobeckyLd(drobecky)} />

      <nav aria-label="Drobečková navigace">
        <ol className="flex flex-wrap items-center gap-x-2 text-xs text-linda-espresso/70">
          {drobecky.map((d, i) => (
            <li key={d.cesta} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === drobecky.length - 1 ? (
                <span aria-current="page" className="font-medium text-linda-cognac">
                  {d.nazev}
                </span>
              ) : (
                <Link href={d.cesta} className="transition-colors hover:text-linda-cognac">
                  {d.nazev}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <DetailProduktu
        produkt={produkt}
        objednavaniZablokovano={nastaveni.rezimDovolene && nastaveni.zablokovatObjednavky}
        popisDph={popisDph(nastaveni)}
      />

      <Suspense
        fallback={
          <SekcePodobnych>
            <KostraMrizky pocet={4} className="sm:grid-cols-2 lg:grid-cols-4" />
          </SekcePodobnych>
        }
      >
        <PodobneProdukty produkt={produkt} />
      </Suspense>
    </div>
  );
}
