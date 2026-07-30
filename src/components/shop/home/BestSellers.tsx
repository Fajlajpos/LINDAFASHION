import React from 'react';
import { NEJPRODAVANEJSI } from '@/lib/home-data';
import { SectionHeading } from './SectionHeading';
import { ProductCardCompact } from './ProductCardCompact';

/**
 * Nejprodávanější kousky – šest karet vedle sebe na desktopu, dvě na mobilu.
 *
 * Serverová komponenta, která vykresluje klientské karty. Handler pro oblíbené
 * se odsud nepředává (funkce nepřejde hranicí server → klient); až bude hotový
 * `useFavorites()`, napojí se přímo v `ProductCardCompact`.
 */
export const BestSellers: React.FC = () => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Nejoblíbenější"
        title="Nejčastěji volené kousky"
        action={{ href: '/produkty', label: 'Zobrazit vše' }}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
        {NEJPRODAVANEJSI.map((produkt) => (
          <ProductCardCompact key={produkt.id} {...produkt} />
        ))}
      </div>
    </div>
  </section>
);
