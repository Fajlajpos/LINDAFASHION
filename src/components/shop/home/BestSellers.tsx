import React from 'react';
import { SectionHeading } from './SectionHeading';
import { ProductCard } from '@/components/shop/ProductCard';
import { nacistDoporucene } from '@/lib/katalog';

/**
 * Kousky, které majitelka v administraci označila jako doporučené.
 *
 * Nadpis dřív zněl „Nejoblíbenější – Nejčastěji volené kousky", jenže výběr
 * nikdy nevycházel z prodejů, jen z ručního zaškrtnutí. Tvrzení o oblíbenosti,
 * které nejde doložit, je klamavá obchodní praktika – proto „Vybrali jsme
 * pro vás", což přesně popisuje, odkud výběr pochází.
 *
 * Používá stejnou kartu jako katalog `/produkty`, aby produkt vypadal na obou
 * místech identicky.
 *
 * Tři sloupce a šest kusů, ne čtyři na čtyři. Čtyři karty ve čtyřech sloupcích
 * dávaly jediný řádek – u sekce, která má ukázat výběr z obchodu, to
 * působilo, že v obchodě skoro nic není. Dvě plné řady vypadají jako nabídka
 * a širší sloupec zároveň nechá kartě víc místa na fotku i název.
 *
 * Serverová komponenta vykreslující klientské karty. Handler pro oblíbené se
 * odsud nepředává (funkce nepřejde hranicí server → klient); až bude hotový
 * `useFavorites()`, napojí se přímo v `ProductCard`.
 */
export const BestSellers = async () => {
  // Produkty označené v administraci jako „doporučené" (sekce 6.2).
  const produkty = await nacistDoporucene(6);

  // Dokud majitelka žádný kousek nedoporučí, sekci raději vynecháme než
  // ukazovat prázdný blok s nadpisem.
  if (produkty.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <SectionHeading
          eyebrow="Doporučujeme"
          title="Vybrali jsme pro vás"
          action={{ href: '/produkty', label: 'Zobrazit vše' }}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {produkty.map((produkt) => (
            <ProductCard key={produkt.id} {...produkt} />
          ))}
        </div>
      </div>
    </section>
  );
};
