import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CategoryGlyph } from './CategoryGlyph';
import { KATEGORIE_CHIPY } from '@/lib/home-data';

/**
 * Kruhové zkratky kategorií v bílé kartě, která se zespoda zanořuje do heru.
 *
 * V kruzích jsou plastické siluety kousků (`CategoryGlyph`) místo dřívější
 * prázdné výplně s monogramem – ta se opakovala šestkrát vedle sebe a nic
 * neříkala.
 *
 * Reliéf: karta i kruhy mají stejnou krémovou barvu jako stránka a od podkladu
 * je odděluje jen měkký stín (`shadow-neu*`). Kruh se při hoveru z vypouklého
 * překlopí do prohlubně – hmatový signál „zmáčknuto“ místo pouhé změny barvy.
 *
 * Na užších displejích se řada posouvá vodorovně (snap), aby se položky
 * nelámaly a hlavně aby nikdy nevznikl vodorovný scroll celé stránky.
 */
export const CategoryCircles: React.FC = () => (
  <section className="relative z-10 -mt-20 lg:-mt-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-linda-cream px-4 py-8 shadow-neuLg sm:px-8">
        <ul className="-mx-4 flex snap-x items-start gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:justify-between lg:overflow-x-visible lg:px-0">
          {KATEGORIE_CHIPY.map((chip) => (
            <li key={chip.href} className="shrink-0 snap-start">
              <Link
                href={chip.href}
                className="group flex min-h-touch cursor-pointer flex-col items-center gap-3 px-2 text-center"
              >
                {chip.accent ? (
                  /* Tmavý akcent – uzavírá řadu a odlišuje poukazy od kategorií */
                  <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-linda-espresso shadow-neuDark transition-all duration-200 group-hover:bg-linda-cognac sm:h-24 sm:w-24">
                    <CategoryGlyph
                      name={chip.glyph}
                      className="h-14 w-14 opacity-90 transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16"
                    />
                  </span>
                ) : (
                  /* Vypouklý → prohloubený při hoveru. Barva zůstává krémová,
                     hloubku dělá výhradně stín. */
                  <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-linda-cream shadow-neu transition-shadow duration-200 group-hover:shadow-neuInset sm:h-24 sm:w-24">
                    <CategoryGlyph
                      name={chip.glyph}
                      className="h-14 w-14 transition-transform duration-300 group-hover:scale-95 sm:h-16 sm:w-16"
                    />
                  </span>
                )}

                <span
                  className={`text-xs transition-colors duration-200 sm:text-sm ${
                    chip.accent
                      ? 'font-semibold text-linda-cognac group-hover:text-linda-cognacHover'
                      : 'text-linda-espresso group-hover:text-linda-cognac'
                  }`}
                >
                  {chip.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Odkaz na celý katalog – na mobilu se řada chipů posouvá a poslední
            položky nemusí být vidět, tohle je jistota. */}
        <div className="mt-6 flex justify-center border-t border-linda-sand/50 pt-5 lg:hidden">
          <Link
            href="/produkty"
            className="group inline-flex min-h-touch cursor-pointer items-center gap-2 text-xs font-medium text-linda-espresso transition-colors hover:text-linda-cognac"
          >
            Zobrazit celý katalog
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </div>
  </section>
);
