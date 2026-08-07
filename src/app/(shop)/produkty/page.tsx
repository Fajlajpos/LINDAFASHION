import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { KatalogVypis, jeRazeni } from '@/components/shop/KatalogVypis';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Katalog kolekcí | LINDA FASHION',
  description:
    'Kompletní nabídka italské dámské módy – šaty, halenky, svetry a kabáty z kvalitních přírodních materiálů.',
  alternates: { canonical: '/produkty' },
};

interface Props {
  searchParams: {
    /** Filtr kategorií má vlastní cestu `/produkty/[kategorie]`; tenhle
     *  parametr zůstává kvůli starším odkazům z hlavičky a patičky. */
    kategorie?: string;
    hledat?: string;
    /** Starší odkazy používaly `search`. */
    search?: string;
    razeni?: string;
    stranka?: string;
  };
}

export default function ProduktyPage({ searchParams }: Props) {
  const hledat = searchParams.hledat ?? searchParams.search ?? null;
  const kategorie = searchParams.kategorie ?? null;
  const stranka = Math.max(1, Number(searchParams.stranka ?? 1) || 1);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Italská dámská móda
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">Kompletní katalog kolekcí</h1>
        {hledat && (
          <p className="text-sm text-linda-espresso/75">
            Výsledky vyhledávání pro:{' '}
            <span className="font-semibold text-linda-cognac">&bdquo;{hledat}&ldquo;</span>
          </p>
        )}
      </div>

      {/* Suspense kvůli `useSearchParams` v přepínači řazení. */}
      <Suspense
        fallback={
          <p className="py-16 text-center text-xs text-linda-espresso/70">Načítám kolekci…</p>
        }
      >
        <KatalogVypis
          kategorie={kategorie}
          hledat={hledat}
          razeni={jeRazeni(searchParams.razeni)}
          stranka={stranka}
        />
      </Suspense>
    </div>
  );
}
