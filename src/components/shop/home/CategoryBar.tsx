import React from 'react';
import Link from 'next/link';

import { CategoryGlyph } from './CategoryGlyph';
import { KATEGORIE_ROZCESTNIK } from '@/lib/home-data';

/**
 * Rozcestník kategorií: karta se zaoblenými rohy, která se zespoda mírně
 * zanořuje do heru.
 *
 * Uvnitř leží název a silueta vedle sebe – vlevo jméno kategorie v serifu,
 * vpravo kousek jako vodoznak ořezaný pravou hranou pole. Vodorovné pole je
 * důvod, proč se karta vejde do 120 px; skládaná ikona nad popiskem si dřív
 * brala přes 230 px hned na nejcennějším místě stránky.
 *
 * Pole nejsou oddělená linkami přes celou výšku – ty z karty dělaly tabulku.
 * Místo nich stojí mezi poli krátká centrovaná ryska, která rytmus naznačí
 * a nechá kartu dýchat.
 *
 * Každé pole je samostatný zaoblený čip s vlastní mezerou od hrany karty.
 * Při najetí se čip do karty zamáčkne (`shadow-neuInsetSm` na `sandLight`),
 * silueta se nadzvedne a název přejde do cognacu – reliéf tak nese i stav,
 * ne jen tvar. Zaoblení čipu ořezává i vodoznak, takže nikde nekončí ostrou
 * hranou.
 *
 * Vodoznak má přesně výšku čipu a ořezává ho jen pravá hrana. Jednotlivé
 * siluety mají v `viewBox` různě vysoký obsah; při ořezu shora vycházel každý
 * kousek jinak useknutý a vypadalo to jako chyba.
 *
 * Pod `lg` se pole posouvají vodorovně; že řada pokračuje, napovídá prolnutí
 * u pravé hrany karty.
 */
export const CategoryBar: React.FC = () => (
  <section aria-label="Kategorie" className="relative z-10 -mt-14 lg:-mt-16">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-linda-cream p-2 shadow-neuFloat">
        <ul className="flex snap-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KATEGORIE_ROZCESTNIK.map((kategorie, i) => (
            <li key={kategorie.href} className="relative shrink-0 snap-start p-1 lg:flex-1">
              {/* Krátká ryska mezi poli. U prvního pole ji nechceme – kreslila
                  by svislou linku hned u hrany karty. */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-10 w-px -translate-y-1/2 bg-linda-sand/80"
                />
              )}

              <Link
                href={kategorie.href}
                className="group relative flex h-[88px] w-[148px] items-center overflow-hidden rounded-2xl px-4 transition-all duration-200 hover:bg-linda-sandLight hover:shadow-neuInsetSm sm:h-24 sm:w-[184px] sm:px-6 lg:w-full"
              >
                <CategoryGlyph
                  name={kategorie.glyph}
                  className={`pointer-events-none absolute -right-4 bottom-0 h-[88px] w-[88px] transition-all duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transform-none sm:-right-5 sm:h-24 sm:w-24 ${
                    kategorie.accent
                      ? 'opacity-60 group-hover:opacity-85'
                      : 'opacity-40 group-hover:opacity-70'
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
          className="pointer-events-none absolute inset-y-0 right-0 w-14 rounded-r-3xl bg-gradient-to-l from-linda-cream to-transparent lg:hidden"
        />
      </div>
    </div>
  </section>
);
