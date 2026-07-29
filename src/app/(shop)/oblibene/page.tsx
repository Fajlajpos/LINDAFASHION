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
      <div className="border-b border-[#E4D9C8] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#405023]">
          <Heart className="w-4 h-4 fill-[#405023]" />
          Váš osobní výběr
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#2B2019]">Oblíbené kousky</h1>
        <p className="text-sm text-[#2B2019]/60 font-light">
          Uložené modely, které vás zaujaly. Můžete je kdykoliv přidat do košíku.
        </p>
      </div>

      {/* Content */}
      {favoriteProducts.length === 0 ? (
        <div className="bg-[#FAF8F4] border border-[#E4D9C8] rounded-3xl p-12 text-center space-y-6 max-w-xl mx-auto shadow-card">
          <div className="w-16 h-16 bg-[#F1F4EB] text-[#405023] rounded-full flex items-center justify-center mx-auto border border-[#405023]/20">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-[#2B2019]">Zatím nemáte žádné oblíbené kousky</h3>
            <p className="text-sm text-[#2B2019]/70 font-light leading-relaxed">
              Klikněte na ikonu srdíčka u kteréhokoliv modelu v katalogu a uložte si své favoritky na později.
            </p>
          </div>
          <div>
            <Link
              href="/produkty"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#7A4B32] text-white text-xs uppercase tracking-wider font-semibold rounded-full hover:bg-[#633B26] transition-colors"
            >
              Prohlédnout kolekci
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProducts.map((product) => (
            <div
              key={product.id}
              className="bg-[#FAF8F4] border border-[#E4D9C8] rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all flex flex-col justify-between space-y-6 relative"
            >
              <button
                onClick={() => toggleFavorite(product.id)}
                className="absolute top-4 right-4 p-2 text-[#7A4B32] hover:text-red-600 transition-colors"
                title="Odebrat z oblíbených"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-2 pr-8">
                <span className="text-[10px] uppercase tracking-widest text-[#7A4B32] font-semibold">
                  {product.znacka}
                </span>
                <h3 className="font-serif text-xl text-[#2B2019]">{product.nazev}</h3>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-base font-semibold text-[#7A4B32]">
                    {(product.cenaPoSleve || product.cena).toLocaleString('cs-CZ')} Kč
                  </span>
                  {product.cenaPoSleve && (
                    <span className="text-xs text-[#2B2019]/50 line-through">
                      {product.cena.toLocaleString('cs-CZ')} Kč
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#E4D9C8]/60">
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
                  className="flex-1 py-2.5 bg-[#405023] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#32401C] transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Do košíku
                </button>
                <Link
                  href={`/produkt/${product.slug}`}
                  className="px-4 py-2.5 border border-[#2B2019]/30 text-[#2B2019] text-xs font-medium rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32] transition-colors"
                >
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
