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
    <div className="group relative bg-[#FFFFFF] rounded-2xl border border-[#E4D9C8]/50 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col h-full">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
        {doporuceny && (
          <span className="bg-[#405023] text-white text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-white/20">
            <Sparkles className="w-3 h-3 text-[#E4D9C8]" />
            Nová kolekce
          </span>
        )}
        {hasDiscount && (
          <span className="bg-[#7A4B32] text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-sm">
            -{discountPercent}%
          </span>
        )}
        {jeDarkovyPoukaz ? (
          <span className="bg-[#2B2019] text-[#E4D9C8] text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Gift className="w-3 h-3 text-[#E4D9C8]" />
            Dárkový poukaz
          </span>
        ) : (
          <span className="bg-[#F1F4EB] text-[#405023] text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border border-[#405023]/25">
            100% Italský materiál
          </span>
        )}
      </div>

      {/* Favorite Heart button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite?.(id);
        }}
        className="absolute top-3 right-3 z-10 p-2.5 bg-[#FAF8F4]/80 backdrop-blur-md rounded-full text-[#2B2019] hover:text-[#7A4B32] hover:bg-white shadow-sm transition-all duration-200"
        aria-label="Přidat do oblíbených"
      >
        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#7A4B32] text-[#7A4B32]' : ''}`} />
      </button>

      {/* Image container with link */}
      <Link href={`/produkt/${slug}`} className="block relative aspect-[3/4] bg-[#FAF8F4] overflow-hidden">
        {obrazekUrl ? (
          <Image
            src={obrazekUrl}
            alt={nazev}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Elegant graphic placeholder for missing photo (No AI images used) */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#FAF8F4] to-[#F3EFE9] text-center">
            <div className="w-16 h-16 rounded-full bg-[#E4D9C8]/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              {jeDarkovyPoukaz ? (
                <Gift className="w-8 h-8 text-[#7A4B32] stroke-[1.5]" />
              ) : (
                <Sparkles className="w-8 h-8 text-[#7A4B32] stroke-[1.5]" />
              )}
            </div>
            <span className="font-serif italic text-lg text-[#2B2019]/80 group-hover:text-[#7A4B32] transition-colors">
              LINDA FASHION
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#7A4B32]/70 mt-1">
              Moda Italiana
            </span>
          </div>
        )}
      </Link>

      {/* Product Content info */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-xs text-[#7A4B32] font-medium tracking-wide mb-1">
            <span>{kategorieNazev || 'Italská móda'}</span>
            {znacka && <span className="text-[#2B2019]/60 font-serif italic">{znacka}</span>}
          </div>

          {/* Title */}
          <Link href={`/produkt/${slug}`}>
            <h3 className="font-serif text-xl text-[#2B2019] font-medium hover:text-[#7A4B32] transition-colors line-clamp-2 leading-snug">
              {nazev}
            </h3>
          </Link>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3 border-t border-[#E4D9C8]/40 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-[#2B2019]">
                {displayPrice?.toLocaleString('cs-CZ')} Kč
              </span>
              {hasDiscount && (
                <span className="text-xs text-[#2B2019]/50 line-through font-normal">
                  {cena.toLocaleString('cs-CZ')} Kč
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/produkt/${slug}`}
            className="text-xs font-medium text-[#7A4B32] hover:text-[#2B2019] underline underline-offset-4 tracking-wide transition-colors"
          >
            Zobrazit detail
          </Link>
        </div>
      </div>
    </div>
  );
};
