import React from 'react';
import { NEJPRODAVANEJSI } from '@/lib/home-data';
import { SectionHeading } from './SectionHeading';
import { ProductCard } from '@/components/shop/ProductCard';

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
export const BestSellers: React.FC = () => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Nejoblíbenější"
        title="Nejčastěji volené kousky"
        action={{ href: '/produkty', label: 'Zobrazit vše' }}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {NEJPRODAVANEJSI.map((produkt) => (
          <ProductCard key={produkt.id} {...produkt} />
        ))}
      </div>
    </div>
  </section>
);
