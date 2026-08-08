import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/shop/ProductCard';
import { DetailProduktu } from '@/components/shop/DetailProduktu';
import { JsonLd } from '@/components/shop/JsonLd';
import { nacistPodobne, nacistProdukt } from '@/lib/katalog';
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

export default async function DetailProduktPage({ params }: Props) {
  const produkt = await nacistProdukt(params.slug);
  if (!produkt) notFound();

  const [podobne, nastaveni] = await Promise.all([nacistPodobne(produkt), nacistNastaveni()]);

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

      {podobne.length > 0 && (
        <section className="space-y-6 border-t border-linda-sand/60 pt-12">
          <h2 className="font-serif text-2xl text-linda-espresso sm:text-3xl">Mohlo by se hodit</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {podobne.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
