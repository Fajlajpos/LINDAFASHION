import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { KatalogVypis, jeRazeni } from '@/components/shop/KatalogVypis';
import { nacistKategorii } from '@/lib/katalog';

export const dynamic = 'force-dynamic';

interface Props {
  params: { kategorie: string };
  searchParams: { razeni?: string; stranka?: string };
}

/**
 * Výpis kategorie – `/produkty/saty`, `/produkty/darkove-poukazy` atd.
 *
 * Tahle routa dřív neexistovala, přestože na ni odkazovala sitemap.xml
 * i patička. Google tedy dostával pět adres, které vracely 404.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kategorie = await nacistKategorii(params.kategorie);
  if (!kategorie) return { title: 'Kategorie nenalezena | LINDA FASHION' };

  const nazev = kategorie.parent ? `${kategorie.parent.nazev} – ${kategorie.nazev}` : kategorie.nazev;

  return {
    title: `${nazev} | LINDA FASHION`,
    description:
      kategorie.popis ??
      `${kategorie.nazev} z naší kolekce italské dámské módy. Kvalitní materiály a nadčasové střihy.`,
    alternates: { canonical: `/produkty/${kategorie.slug}` },
  };
}

/*
 * `generateStaticParams` tu schválně NENÍ.
 *
 * Stránka je `force-dynamic` (ceny a skladovost se mění), takže by
 * předgenerování cest nic nepřineslo – zato by při buildu sáhlo do databáze.
 * V Dockeru se image staví bez běžícího Postgresu, takže build padal na
 * `Can't reach database server`. Lokálně to prošlo jen proto, že tam
 * vývojová databáze náhodou běžela.
 */

export default async function KategoriePage({ params, searchParams }: Props) {
  const kategorie = await nacistKategorii(params.kategorie);
  if (!kategorie) notFound();

  const stranka = Math.max(1, Number(searchParams.stranka ?? 1) || 1);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-linda-sand pb-8">
        {/* Drobečková navigace se zároveň propisuje do strukturovaných dat
            (BreadcrumbList) v layoutu SEO. */}
        <nav aria-label="Drobečková navigace">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-linda-espresso/70">
            <li>
              <Link href="/produkty" className="hover:text-linda-cognac hover:underline">
                Katalog
              </Link>
            </li>
            {kategorie.parent && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <li>
                  <Link
                    href={`/produkty/${kategorie.parent.slug}`}
                    className="hover:text-linda-cognac hover:underline"
                  >
                    {kategorie.parent.nazev}
                  </Link>
                </li>
              </>
            )}
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <li aria-current="page" className="font-medium text-linda-espresso">
              {kategorie.nazev}
            </li>
          </ol>
        </nav>

        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">{kategorie.nazev}</h1>

        {kategorie.popis && (
          <p className="max-w-2xl text-sm leading-relaxed text-linda-espresso/75">{kategorie.popis}</p>
        )}
      </div>

      <Suspense
        fallback={<p className="py-16 text-center text-xs text-linda-espresso/70">Načítám kolekci…</p>}
      >
        <KatalogVypis
          kategorie={kategorie.slug}
          razeni={jeRazeni(searchParams.razeni)}
          stranka={stranka}
          zakladniCesta={`/produkty/${kategorie.slug}`}
        />
      </Suspense>
    </div>
  );
}
