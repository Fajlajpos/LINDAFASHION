import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { KATEGORIE_DLAZDICE } from '@/lib/home-data';
import { MediaFrame } from './MediaFrame';
import { SectionHeading } from './SectionHeading';

/**
 * Sekce „Najděte svůj dokonalý styl“ – portrétové dlaždice hlavních kategorií.
 *
 * Dlaždice zůstávají i na nejmenších displejích ve dvou sloupcích: poměr 3/4 je
 * na jeden sloupec příliš vysoký a uživatel by kvůli scrollování ztratil přehled
 * o nabídce. Celá dlaždice je jeden odkaz, řádek „Prohlédnout“ je proto jen
 * dekorativní text – vnořené odkazy by rozbily čtečky i pořadí tabulátoru.
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {KATEGORIE_DLAZDICE.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl bg-linda-sandLight shadow-card transition-shadow duration-300 hover:shadow-elevated"
          >
            <MediaFrame
              src={tile.obrazek}
              alt={tile.alt}
              sizes="(max-width: 1024px) 50vw, 25vw"
              zoomOnHover
            />

            {/* Stín pod textem – drží kontrast i nad světlou fotkou */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-linda-espresso/75 via-linda-espresso/10 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <span className="block font-serif text-xl text-linda-cream sm:text-2xl">
                {tile.title}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-linda-cream/90 sm:text-sm">
                Prohlédnout
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);
