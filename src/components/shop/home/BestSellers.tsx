import React from 'react';
import { SectionHeading } from './SectionHeading';
import { ProductCard } from '@/components/shop/ProductCard';
import { nacistDoporucene } from '@/lib/katalog';

/**
 * Nejprodávanější kousky.
 *
 * Používá stejnou kartu jako katalog `/produkty`, aby produkt vypadal na obou
 * místech identicky.
 *
 * Tři sloupce a šest kusů, ne čtyři na čtyři. Čtyři karty ve čtyřech sloupcích
 * dávaly jediný řádek – u sekce, která má ukázat, co se nejvíc prodává, to
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
          eyebrow="Nejoblíbenější"
          title="Nejčastěji volené kousky"
          action={{ href: '/produkty', label: 'Zobrazit vše' }}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produkty.map((produkt) => (
            <ProductCard key={produkt.id} {...produkt} />
          ))}
        </div>
      </div>
    </section>
  );
};
