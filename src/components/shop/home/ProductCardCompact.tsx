'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import { MediaFrame } from './MediaFrame';

export interface ProductCardCompactProps {
  id: string;
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve?: number | null;
  /**
   * Kategorie se v kompaktní kartě záměrně nevypisuje – v mřížce po šesti
   * kouscích by řádek navíc jen zahušťoval sazbu. Prop zůstává v rozhraní,
   * aby šlo `HomeProduct` rozprostřít beze zbytku.
   */
  kategorieNazev: string;
  obrazek: string | null;
  hodnoceni?: number;
  pocetHodnoceni?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

/**
 * Štíhlá varianta produktové karty pro homepage.
 *
 * Oproti `ProductCard` nemá rámeček, stín ani vlastní pozadí – kousky stojí
 * přímo na krémové ploše stránky, aby v šestisloupcové mřížce působily vzdušně.
 * Plnou kartu s odznaky a CTA používá dál výpis v katalogu.
 */
export const ProductCardCompact: React.FC<ProductCardCompactProps> = ({
  id,
  nazev,
  slug,
  cena,
  cenaPoSleve,
  obrazek,
  hodnoceni,
  pocetHodnoceni,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const hasDiscount = Boolean(cenaPoSleve && cenaPoSleve < cena);
  const displayPrice = hasDiscount ? cenaPoSleve : cena;
  const discountPercent = hasDiscount ? Math.round(((cena - cenaPoSleve!) / cena) * 100) : 0;

  return (
    <div className="group relative flex flex-col">
      {/* Obrazová plocha – odkaz je jen dekorativní zdvojení titulku níže */}
      <Link
        href={`/produkt/${slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-linda-sandLight"
      >
        <MediaFrame
          src={obrazek}
          alt=""
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          zoomOnHover
        />
      </Link>

      {/* Oblíbené */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite?.(id);
        }}
        className="absolute right-2 top-2 z-10 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-white/85 text-linda-espresso backdrop-blur-sm transition-colors duration-200 hover:text-linda-cognac"
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? `Odebrat ${nazev} z oblíbených` : `Přidat ${nazev} do oblíbených`
        }
      >
        <Heart
          className={`h-4 w-4 ${isFavorite ? 'fill-linda-cognac text-linda-cognac' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Sleva */}
      {hasDiscount && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-linda-cognac px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="sr-only">Sleva </span>-{discountPercent}%
        </span>
      )}

      <div className="space-y-1.5 pt-4">
        <h3 className="line-clamp-2 font-serif text-lg leading-snug text-linda-espresso">
          <Link href={`/produkt/${slug}`} className="transition-colors hover:text-linda-cognac">
            {nazev}
          </Link>
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-linda-espresso">
            {displayPrice?.toLocaleString('cs-CZ')} Kč
          </span>
          {hasDiscount && (
            <span className="text-xs text-linda-espresso/55 line-through">
              <span className="sr-only">Původní cena </span>
              {cena.toLocaleString('cs-CZ')} Kč
            </span>
          )}
        </div>

        {/* Hvězdičky jen se skutečnými daty – bez recenzí řádek vůbec nevznikne */}
        {typeof hodnoceni === 'number' && (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((hvezda) => (
                <Star
                  key={hvezda}
                  className={`h-3.5 w-3.5 ${
                    hvezda <= Math.round(hodnoceni)
                      ? 'fill-linda-cognac text-linda-cognac'
                      : 'text-linda-sand'
                  }`}
                />
              ))}
            </span>
            {typeof pocetHodnoceni === 'number' && (
              <span className="text-xs text-linda-espresso/55" aria-hidden="true">
                ({pocetHodnoceni})
              </span>
            )}
            <span className="sr-only">
              Hodnocení {hodnoceni.toLocaleString('cs-CZ')} z 5 hvězdiček
              {typeof pocetHodnoceni === 'number'
                ? `, ${pocetHodnoceni.toLocaleString('cs-CZ')} hodnocení zákazníků`
                : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
