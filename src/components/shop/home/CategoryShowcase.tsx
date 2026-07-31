import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { KATEGORIE_DLAZDICE } from '@/lib/home-data';
import { CategoryGlyph } from './CategoryGlyph';
import { SectionHeading } from './SectionHeading';

/**
 * Sekce „Najděte svůj dokonalý styl“.
 *
 * Dřív to byly portrétové fotodlaždice s tmavým přechodem a textem přes obraz.
 * Bez nafocených fotek z nich zbývaly šedé obdélníky, a i s fotkami je text
 * přes snímek vždycky kompromis v čitelnosti. Nově je to světlá karta:
 * nahoře ilustrace v oblouku, pod ní název a popis na klidném podkladu.
 *
 * Pořadové číslo drží editoriální rytmus a zároveň napovídá, kolik kategorií
 * v řadě je. Celá karta je jeden odkaz – šipka i číslo jsou dekorace, vnořené
 * odkazy by rozbily čtečky i pořadí tabulátoru.
 */
export const CategoryShowcase: React.FC = () => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Nakupujte podle kategorie"
        title={
          <>
            Najděte svůj
            <br />
            dokonalý styl
          </>
        }
        action={{ href: '/produkty', label: 'Všechny kategorie' }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {KATEGORIE_DLAZDICE.map((tile, i) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-linda-sand bg-white transition-all duration-300 hover:border-linda-cognac hover:shadow-elevated"
          >
            {/* Ilustrace v oblouku – tvar odkazuje na výlohu butiku */}
            <div className="relative flex justify-center px-6 pt-6">
              <div className="flex w-full justify-center rounded-t-[999px] rounded-b-2xl bg-gradient-to-b from-linda-sandLight to-linda-cream py-7">
                <CategoryGlyph
                  name={tile.glyph}
                  className="h-24 w-24 transition-transform duration-300 group-hover:-translate-y-1 sm:h-28 sm:w-28"
                />
              </div>

              <span
                aria-hidden="true"
                className="absolute right-8 top-8 text-[11px] font-semibold tabular-nums tracking-[0.2em] text-linda-espresso/70"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-6">
              <h3 className="font-serif text-xl leading-snug text-linda-espresso transition-colors duration-200 group-hover:text-linda-cognac sm:text-2xl">
                {tile.title}
              </h3>
              <p className="text-xs leading-relaxed text-linda-espresso/70">{tile.popis}</p>

              <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-linda-espresso">
                Prohlédnout
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-linda-sand transition-colors duration-200 group-hover:border-linda-cognac group-hover:bg-linda-cognac group-hover:text-white">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);
