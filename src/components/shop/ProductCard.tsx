'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Sparkles, Gift } from 'lucide-react';

export interface ProductCardProps {
  id: string;
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve?: number | null;
  znacka?: string | null;
  kategorieNazev?: string;
  obrazekUrl?: string | null;
  doporuceny?: boolean;
  jeDarkovyPoukaz?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  nazev,
  slug,
  cena,
  cenaPoSleve,
  znacka,
  kategorieNazev,
  obrazekUrl,
  doporuceny,
  jeDarkovyPoukaz,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const hasDiscount = Boolean(cenaPoSleve && cenaPoSleve < cena);
  const displayPrice = hasDiscount ? cenaPoSleve : cena;
  const discountPercent = hasDiscount ? Math.round(((cena - cenaPoSleve!) / cena) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-linda-sand/50 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col h-full">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
        {doporuceny && (
          <span className="bg-linda-sage text-white text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3 text-linda-sand" aria-hidden="true" />
            Nová kolekce
          </span>
        )}
        {hasDiscount && (
          <span className="bg-linda-cognac text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-sm">
            <span className="sr-only">Sleva </span>-{discountPercent}%
          </span>
        )}
        {jeDarkovyPoukaz ? (
          <span className="bg-linda-espresso text-linda-sand text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Gift className="w-3 h-3 text-linda-sand" aria-hidden="true" />
            Dárkový poukaz
          </span>
        ) : (
          <span className="bg-linda-sageLight text-linda-sage text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border border-linda-sage/25">
            100% Italský materiál
          </span>
        )}
      </div>

      {/* Favorite Heart button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite?.(id);
        }}
        className="absolute top-2 right-2 z-10 min-h-touch min-w-touch flex items-center justify-center cursor-pointer bg-linda-cream/80 backdrop-blur-md rounded-full text-linda-espresso hover:text-linda-cognac hover:bg-white shadow-sm transition-all duration-200"
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Odebrat ${nazev} z oblíbených`
            : `Přidat ${nazev} do oblíbených`
        }
      >
        <Heart
          className={`w-4 h-4 ${isFavorite ? 'fill-linda-cognac text-linda-cognac' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Image container with link */}
      <Link
        href={`/produkt/${slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block relative aspect-[3/4] bg-linda-cream overflow-hidden"
      >
        {obrazekUrl ? (
          <Image
            src={obrazekUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Elegant graphic placeholder for missing photo (No AI images used) */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-linda-cream to-linda-sandLight text-center">
            <div className="w-16 h-16 rounded-full bg-linda-sand/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              {jeDarkovyPoukaz ? (
                <Gift className="w-8 h-8 text-linda-cognac stroke-[1.5]" aria-hidden="true" />
              ) : (
                <Sparkles className="w-8 h-8 text-linda-cognac stroke-[1.5]" aria-hidden="true" />
              )}
            </div>
            <span className="font-serif italic text-lg text-linda-espresso/80 group-hover:text-linda-cognac transition-colors">
              LINDA FASHION
            </span>
            <span className="text-[11px] tracking-widest uppercase text-linda-cognac mt-1">
              Moda Italiana
            </span>
          </div>
        )}
      </Link>

      {/* Product Content info */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-xs text-linda-cognac font-medium tracking-wide mb-1">
            <span>{kategorieNazev || 'Italská móda'}</span>
            {znacka && <span className="text-linda-espresso/75 font-serif italic">{znacka}</span>}
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl text-linda-espresso font-medium line-clamp-2 leading-snug">
            <Link
              href={`/produkt/${slug}`}
              className="rounded-sm hover:text-linda-cognac transition-colors"
            >
              {nazev}
            </Link>
          </h3>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-linda-sand/40 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-linda-espresso">
                {displayPrice?.toLocaleString('cs-CZ')} Kč
              </span>
              {hasDiscount && (
                <span className="text-xs text-linda-espresso/75 line-through font-normal">
                  <span className="sr-only">Původní cena </span>
                  {cena.toLocaleString('cs-CZ')} Kč
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/produkt/${slug}`}
            className="shrink-0 flex items-center min-h-touch text-xs font-medium text-linda-cognac hover:text-linda-espresso underline underline-offset-4 tracking-wide transition-colors rounded-sm"
          >
            Zobrazit detail<span className="sr-only"> – {nazev}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
