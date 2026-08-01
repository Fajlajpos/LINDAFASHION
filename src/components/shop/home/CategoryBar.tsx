import React from 'react';
import Link from 'next/link';

import { CategoryGlyph } from './CategoryGlyph';
import { KATEGORIE_ROZCESTNIK } from '@/lib/home-data';

/**
 * Rozcestník kategorií: karta se zaoblenými rohy, která se zespoda mírně
 * zanořuje do heru.
 *
 * Obsah karty je vodorovný. Původní verze skládaly ikonu nad popisek, takže
 * jedno pole bylo přes 170 px vysoké a karta s odsazením přesáhla 230 px –
 * hned na nejcennějším místě stránky. Tady leží název a silueta vedle sebe:
 * vlevo jméno kategorie v serifu, vpravo kousek jako vodoznak, který přetéká
 * přes pravou hranu pole. Karta se tím vejde do 104 px.
 *
 * Pole jdou od hrany k hraně a oddělují je vlasové linky. Rohy ořezává
 * `overflow-hidden` karty, takže krajní pole kopírují její zaoblení a nikde
 * nevzniká druhý obrys – linka spolu s reliéfním stínem by tutéž hranu
 * kreslila dvakrát.
 *
 * Vodoznak má přesně výšku pole a ořezává ho jen pravá hrana. Jednotlivé
 * siluety mají v `viewBox` různě vysoký obsah; při ořezu shora vycházel každý
 * kousek jinak useknutý a vypadalo to jako chyba.
 *
 * Pod `lg` se pole posouvají vodorovně; že řada pokračuje, napovídá prolnutí
 * u pravé hrany karty.
 */
export const CategoryBar: React.FC = () => (
  <section aria-label="Kategorie" className="relative z-10 -mt-14 lg:-mt-16">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-linda-cream shadow-neuLg">
        <ul className="flex snap-x divide-x divide-linda-sand/60 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KATEGORIE_ROZCESTNIK.map((kategorie) => (
            <li key={kategorie.href} className="shrink-0 snap-start lg:flex-1">
              <Link
                href={kategorie.href}
                /* Prohlubeň při najetí: pole se do karty zamáčkne, místo aby
                   se jen přebarvilo. Reliéf tak nese i tenhle stav. */
                className="group relative flex h-24 w-[152px] items-center overflow-hidden px-5 transition-all duration-200 hover:bg-linda-sandLight hover:shadow-neuInsetSm sm:h-28 sm:w-[190px] sm:px-7 lg:w-full"
              >
                <CategoryGlyph
                  name={kategorie.glyph}
                  className={`pointer-events-none absolute -right-5 bottom-0 h-24 w-24 transition-all duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transform-none sm:-right-6 sm:h-28 sm:w-28 ${
                    kategorie.accent
                      ? 'opacity-55 group-hover:opacity-80'
                      : 'opacity-35 group-hover:opacity-65'
                  }`}
                />

                <span
                  className={`relative font-serif text-lg leading-tight tracking-wide transition-colors duration-200 sm:text-xl ${
                    kategorie.accent
                      ? 'text-linda-cognac group-hover:text-linda-cognacHover'
                      : 'text-linda-espresso group-hover:text-linda-cognac'
                  }`}
                >
                  {kategorie.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Náznak, že řada pokračuje za hranou karty. `pointer-events-none`,
            ať nepřekáží kliknutí na poslední pole. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-linda-cream to-transparent lg:hidden"
        />
      </div>
    </div>
  </section>
);
