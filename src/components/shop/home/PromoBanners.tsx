import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PROMO_BANNERY } from '@/lib/home-data';
import { MediaFrame } from './MediaFrame';

/**
 * Dvojice promo bannerů.
 *
 * Layout je vodorovně rozdělený: text vlevo v normálním toku, obrazová plocha
 * vpravo absolutně. Místo pro ni si text rezervuje procentuálním pravým
 * paddingem, takže se titulek ani tlačítko nikdy nepřekryjí. Levý přechod
 * plochu vpíjí do pískového panelu.
 *
 * Na mobilu sedí obrazová plocha v pravém horním rohu, vedle štítku
 * a nadpisu – jen do jejich výšky (`h-36`), ne přes celou kartu. Přes celou
 * výšku z ní ve `w-1/3` zbýval svislý proužek, který četl jako rozbitý
 * layout, a dlouhé tlačítko by do ní vjelo; takhle má tlačítko pod ní celou
 * šířku. Pás přes celou šířku nad textem kartu zbytečně natáhl a ilustrace
 * se v něm ztrácela.
 */
export const PromoBanners: React.FC = () => (
  <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Aktuální nabídky">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {PROMO_BANNERY.map((promo) => (
        <div
          key={promo.cta.href}
          className="relative flex flex-col overflow-hidden rounded-2xl bg-linda-sandLight shadow-neu sm:min-h-[280px] sm:flex-row"
        >
          {/* Obrazová plocha – na mobilu roh vpravo nahoře, od `sm` celá pravá strana. */}
          <div className="absolute right-0 top-0 h-36 w-[42%] sm:inset-y-0 sm:h-auto sm:w-2/5 lg:w-[45%]">
            <MediaFrame
              src={promo.obrazek}
              glyph={promo.glyph}
              alt={promo.alt}
              sizes="(max-width: 640px) 42vw, (max-width: 1024px) 40vw, 25vw"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-linda-sandLight to-transparent"
            />
            {/* Na mobilu plocha končí pod nadpisem, ne u dna karty – bez
                druhého přechodu by tam zůstala ostrá vodorovná hrana. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-linda-sandLight via-transparent to-transparent sm:hidden"
            />
          </div>

          {/* Na mobilu drží pravý odstup jen štítek a nadpis (vedle obrázku),
              tlačítko pod nimi má celou šířku karty. */}
          <div className="relative z-10 flex w-full flex-col items-start justify-center gap-4 p-6 sm:gap-5 sm:p-10 sm:pr-[44%] lg:pr-[48%]">
            <span className="pr-[44%] text-[11px] sm:pr-0 font-semibold uppercase tracking-[0.2em] text-linda-espresso/70">
              {promo.eyebrow}
            </span>

            <p className="min-h-[3.75rem] pr-[44%] font-serif text-2xl leading-[1.15] text-linda-espresso sm:min-h-0 sm:pr-0 sm:text-[2rem]">
              {promo.titleLines[0]}
              <br />
              {promo.titleLines[1]}
            </p>

            <Link
              href={promo.cta.href}
              className="group inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-6 py-3.5 text-xs font-medium text-linda-cream shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm sm:text-sm"
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
