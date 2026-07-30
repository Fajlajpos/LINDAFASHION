import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PROMO_BANNERY } from '@/lib/home-data';
import { MediaFrame } from './MediaFrame';

/**
 * Dvojice promo bannerů pod dlaždicemi kategorií.
 *
 * Layout je vodorovně rozdělený: text vlevo v normálním toku, fotka vpravo
 * absolutně. Místo pro fotku si text rezervuje procentuálním pravým paddingem,
 * takže se titulek ani tlačítko nikdy nepřekryjí – ani na 375 px, kde je fotka
 * zúžená na třetinu šířky. Levý přechod fotku vpíjí do pískového panelu.
 */
export const PromoBanners: React.FC = () => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Aktuální nabídky">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {PROMO_BANNERY.map((promo) => (
        <div
          key={promo.cta.href}
          className="relative flex min-h-[240px] overflow-hidden rounded-2xl bg-linda-sandLight sm:min-h-[280px]"
        >
          {/* Fotka vpravo – na mobilu jen úzký pruh, ať zbyde místo na CTA */}
          <div className="absolute inset-y-0 right-0 w-1/3 sm:w-2/5 lg:w-[45%]">
            <MediaFrame
              src={promo.obrazek}
              alt={promo.alt}
              sizes="(max-width: 1024px) 40vw, 25vw"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-linda-sandLight to-transparent"
            />
          </div>

          <div className="relative z-10 flex w-full flex-col items-start justify-center gap-4 p-6 pr-[40%] sm:gap-5 sm:p-10 sm:pr-[44%] lg:pr-[48%]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-espresso/50">
              {promo.eyebrow}
            </span>

            <p className="font-serif text-2xl leading-[1.15] text-linda-espresso sm:text-[2rem]">
              {promo.titleLines[0]}
              <br />
              {promo.titleLines[1]}
            </p>

            <Link
              href={promo.cta.href}
              className="group inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-6 py-3.5 text-xs font-medium text-linda-cream transition-colors duration-200 hover:bg-linda-cognac sm:text-sm"
            >
              {promo.cta.label}
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      ))}
    </div>
  </section>
);
