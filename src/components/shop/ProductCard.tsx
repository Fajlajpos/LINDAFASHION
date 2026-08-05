'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Sparkles, Gift } from 'lucide-react';
import { CategoryGlyph, type CategoryGlyphName } from '@/components/shop/home/CategoryGlyph';
import { useFavorites } from '@/lib/favorites-context';

/**
 * Kategorie → ilustrace pro kartu bez fotografie.
 *
 * Párujeme přes název kategorie, ne přes slug: karta ho dostává jako jediný
 * údaj o zařazení. Diakritiku i tvary ošetřují volné regulární výrazy.
 */
const GLYF_PODLE_KATEGORIE: ReadonlyArray<readonly [RegExp, CategoryGlyphName]> = [
  [/pouk|dárk|dark/i, 'poukazy'],
  [/šat|sat/i, 'saty'],
  [/halenk|košil|kosil/i, 'halenky'],
  [/svetr|kardig/i, 'svetry'],
  [/sak|kabát|kabat/i, 'saka'],
];

const vyberGlyf = (kategorie?: string | null, jePoukaz?: boolean): CategoryGlyphName => {
  if (jePoukaz) return 'poukazy';
  const nalez = GLYF_PODLE_KATEGORIE.find(([vzor]) => vzor.test(kategorie ?? ''));
  return nalez ? nalez[1] : 'vse';
};

/**
 * Identita karty je `slug` – ID sem nepatří, karta ho k ničemu nepoužívá
 * a oblíbené se drží také na slugu. Volající ho může klidně rozprostřít
 * (`{...produkt}`), JSX přebytečná pole ignoruje.
 */
export interface ProductCardProps {
  nazev: string;
  slug: string;
  cena: number;
  cenaPoSleve?: number | null;
  znacka?: string | null;
  kategorieNazev?: string | null;
  obrazekUrl?: string | null;
  doporuceny?: boolean;
  jeDarkovyPoukaz?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  nazev,
  slug,
  cena,
  cenaPoSleve,
  znacka,
  kategorieNazev,
  obrazekUrl,
  doporuceny,
  jeDarkovyPoukaz,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const jeOblibeny = isFavorite(slug);
  const hasDiscount = Boolean(cenaPoSleve && cenaPoSleve < cena);
  const displayPrice = hasDiscount ? cenaPoSleve : cena;
  const discountPercent = hasDiscount ? Math.round(((cena - cenaPoSleve!) / cena) * 100) : 0;

  return (
    /* Karta má stejnou barvu jako stránka – od podkladu ji dělí jen reliéf.
       Rámeček by hranu ohraničil podruhé, proto tu není. */
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-linda-cream shadow-neu transition-all duration-300 hover:shadow-neuLg">
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
        {/* „100% Italský materiál“ visí na každém kusu v nabídce, takže sama
            o sobě nic neodlišuje – ve dvojici s „Nová kolekce“ nebo slevou jen
            dělala ze štítků shluk. Zobrazí se proto jen tam, kde karta jiný
            štítek nemá, a zůstane z ní tichá jistota místo hluku. */}
        {jeDarkovyPoukaz ? (
          <span className="bg-linda-espresso text-linda-sand text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Gift className="w-3 h-3 text-linda-sand" aria-hidden="true" />
            Dárkový poukaz
          </span>
        ) : (
          !doporuceny &&
          !hasDiscount && (
            <span className="bg-linda-sageLight text-linda-sage text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border border-linda-sage/25">
              100% Italský materiál
            </span>
          )
        )}
      </div>

      {/* Favorite Heart button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite({
            slug,
            nazev,
            cena,
            cenaPoSleve,
            znacka,
            kategorieNazev,
            obrazekUrl,
            jeDarkovyPoukaz,
          });
        }}
        /* Srdíčko leží na fotce; u chybějícího snímku by na krému splynulo,
           proto ho drží reliéf místo sotva znatelného `shadow-sm`.
           Uložený stav = zamáčknuté tlačítko, stejně jako na detailu:
           nese ho tvar i výplň srdíčka, ne jenom barva. */
        className={`absolute right-2 top-2 z-10 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 ${
          jeOblibeny
            ? 'bg-linda-sandLight/90 text-linda-cognac shadow-neuInsetSm'
            : 'bg-linda-cream/80 text-linda-espresso shadow-neuSm hover:bg-white hover:text-linda-cognac active:shadow-neuInsetSm'
        }`}
        aria-pressed={jeOblibeny}
        aria-label={
          jeOblibeny
            ? `Odebrat ${nazev} z oblíbených`
            : `Přidat ${nazev} do oblíbených`
        }
      >
        <Heart
          className={`w-4 h-4 ${jeOblibeny ? 'fill-linda-cognac text-linda-cognac' : ''}`}
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
          /* Zástupná plocha bez fotografie.
             Dřív tu byla ikonka jiskřiček a pod ní dvakrát název značky –
             na mřížce šesti karet vedle sebe vznikla řada identických polí,
             která čtou jako „chybí obrázek“. Teď plochu drží silueta kousku
             podle jeho kategorie: karty se od sebe liší, plocha vypadá
             záměrně a hned je vidět, o jaký typ oblečení jde. */
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-linda-sandLight via-linda-cream to-linda-sand/60">
            <CategoryGlyph
              name={vyberGlyf(kategorieNazev, jeDarkovyPoukaz)}
              className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-4 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-linda-espresso/60">
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
