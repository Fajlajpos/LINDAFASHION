'use client';

import React from 'react';
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites-context';
import { ProductCard } from '@/components/shop/ProductCard';
import { Heart, ArrowRight } from 'lucide-react';

export default function OblibenePage() {
  /* Seznam přichází z `localStorage` jako hotové otisky produktů – stránka
     si tedy nemusí držet vlastní kopii katalogu a ukáže i kousky uložené
     odjinud. Odebírá se srdíčkem na samotné kartě. */
  const { favorites } = useFavorites();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-2 border-b border-linda-sand pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-linda-sage">
          <Heart className="h-4 w-4 fill-linda-sage" aria-hidden="true" />
          Váš osobní výběr
        </div>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">Oblíbené kousky</h1>
        <p className="text-sm font-light text-linda-espresso/70">
          Uložené modely, které vás zaujaly. Otevřete detail, vyberte velikost a máte hotovo.
        </p>
      </div>

      {/* Content */}
      {favorites.length === 0 ? (
        <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-linda-cream p-12 text-center shadow-neu">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sageLight text-linda-sage shadow-neuInset">
            <Heart className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-linda-espresso">Zatím nemáte žádné oblíbené kousky</h2>
            <p className="text-sm font-light leading-relaxed text-linda-espresso/75">
              Klikněte na ikonu srdíčka u kteréhokoliv modelu v katalogu a uložte si své favoritky na později.
            </p>
          </div>
          <div>
            <Link
              href="/produkty"
              className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Prohlédnout kolekci
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        /* Stejná karta jako v katalogu: srdíčko na ní je už zamáčknuté a
           slouží k odebrání, takže tu nemusí být zvláštní tlačítko s košem.
           Do košíku se přidává až na detailu, kde je vidět velikost. */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((product) => (
            <ProductCard key={product.slug} {...product} />
          ))}
        </div>
      )}
    </div>
  );
}
