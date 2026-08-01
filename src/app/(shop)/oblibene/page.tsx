'use client';

import React from 'react';
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites-context';
import { useCart } from '@/lib/cart-context';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

export default function OblibenePage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();

  // Vzorové produkty pro zobrazení oblíbených
  const sampleProducts = [
    {
      id: 'p1',
      nazev: 'Hedvábné šaty Bellissima',
      slug: 'hedvabne-saty-bellissima',
      cena: 3490,
      znacka: 'Milano Elegance',
      variantId: 'v1',
      velikost: 'M',
      skladem: 5,
    },
    {
      id: 'p2',
      nazev: 'Lněná halenka Firenze',
      slug: 'lnena-halenka-firenze',
      cena: 1890,
      znacka: 'Toscana Style',
      variantId: 'v2',
      velikost: 'S',
      skladem: 3,
    },
    {
      id: 'p3',
      nazev: 'Kašmírový svetr Roma',
      slug: 'kasmirovy-svetr-roma',
      cena: 2990,
      cenaPoSleve: 2390,
      znacka: 'Roma Knitwear',
      variantId: 'v3',
      velikost: 'L',
      skladem: 4,
    },
    {
      id: 'p4',
      nazev: 'Vlněný kabát Venezia',
      slug: 'vlneny-kabat-venezia',
      cena: 5490,
      znacka: 'Venezia Tailoring',
      variantId: 'v4',
      velikost: 'M',
      skladem: 2,
    },
  ];

  const favoriteProducts = sampleProducts.filter((p) => favorites.includes(p.id));

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
          Uložené modely, které vás zaujaly. Můžete je kdykoliv přidat do košíku.
        </p>
      </div>

      {/* Content */}
      {favoriteProducts.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProducts.map((product) => (
            <div
              key={product.id}
              className="relative flex flex-col justify-between space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neu transition-all duration-300 hover:shadow-neuLg"
            >
              {/* `title` odečítač obrazovky spolehlivě nečte – popis akce
                  proto nese `aria-label` se jménem konkrétního modelu. */}
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                aria-label={`Odebrat z oblíbených – ${product.nazev}`}
                className="absolute right-4 top-4 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-cognac shadow-neuSm transition-all duration-200 hover:text-red-700 active:shadow-neuInsetSm"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="space-y-2 pr-12">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-linda-cognac">
                  {product.znacka}
                </span>
                <h2 className="font-serif text-xl text-linda-espresso">{product.nazev}</h2>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-base font-semibold text-linda-cognac">
                    {(product.cenaPoSleve || product.cena).toLocaleString('cs-CZ')} Kč
                  </span>
                  {product.cenaPoSleve && (
                    /* /50 dávalo 3,4:1 – přeškrtnutá cena je pořád text. */
                    <span className="text-xs text-linda-espresso/75 line-through">
                      <span className="sr-only">Původní cena </span>
                      {product.cena.toLocaleString('cs-CZ')} Kč
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-linda-sand/60 pt-4">
                <button
                  onClick={() => {
                    addToCart({
                      variantId: product.variantId,
                      productId: product.id,
                      nazev: product.nazev,
                      slug: product.slug,
                      cena: product.cena,
                      cenaPoSleve: product.cenaPoSleve,
                      velikost: product.velikost,
                      mnozstvi: 1,
                      skladem: product.skladem,
                    });
                  }}
                  className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-sage text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-sageHover active:shadow-neuSm"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Do košíku
                </button>
                <Link
                  href={`/produkt/${product.slug}`}
                  className="flex min-h-touch shrink-0 cursor-pointer items-center rounded-full bg-linda-cream px-4 text-xs font-medium text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm"
                >
                  Detail<span className="sr-only"> – {product.nazev}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
