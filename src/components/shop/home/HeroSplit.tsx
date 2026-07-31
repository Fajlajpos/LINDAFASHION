import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Headset, Package, ShieldCheck, Truck } from 'lucide-react';
import { MediaFrame } from './MediaFrame';
import { VYHODY, type HomeTrustItem } from '@/lib/home-data';

/** Názvy ikon z dat mapujeme na komponenty až tady – data zůstávají bez Reactu. */
const IKONY: Record<HomeTrustItem['icon'], React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  package: Package,
  shield: ShieldCheck,
  headset: Headset,
};

/**
 * Úvodní editorial hero: text vlevo na krémové ploše, fotografie vpravo
 * na spad k pravému okraji obrazovky.
 *
 * Na mobilu jde fotografie první (poměr 4/5) a text pod ni – palec tak má
 * tlačítka v dosahu a snímek nesnižuje čitelnost titulku.
 *
 * Spodní odsazení (`pb-28`) je záměrně velké: `CategoryCircles` se do heru
 * zespoda zanořuje záporným marginem.
 */
export const HeroSplit: React.FC = () => (
  <section className="relative overflow-hidden bg-linda-cream pb-28 lg:pb-36">
    <div className="lg:grid lg:grid-cols-12 lg:items-stretch">
      {/* Fotografie – na mobilu nahoře, na lg vpravo v mřížce (col 7–12).
          Záporný spodní margin ji protahuje skrz spodní odsazení sekce až k
          její hraně, aby se karta kategorií měla do čeho zanořit. */}
      <div className="relative aspect-[4/5] w-full lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:-mb-36 lg:aspect-auto lg:h-full lg:min-h-[88vh]">
        <MediaFrame
          src="/hero-editorial.jpg"
          alt="Žena v lněných šatech z italské kolekce"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          objectPosition="object-[70%_25%]"
        />

        {/* Číselník 01/02/03 tu původně sliboval tři snímky, které neexistují –
            odstraněn. Zůstává jen jemné ztmavení levé hrany, aby přechod do
            krémového panelu nebyl tvrdý řez. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-linda-cream/45 to-transparent lg:block"
        />
      </div>

      {/* Textový panel – na širokých displejích zarovnaný na stejnou levou
          hranu jako obsahový kontejner zbytku stránky (max-w-7xl + px-8). */}
      <div className="relative isolate px-4 pb-4 pt-12 sm:px-6 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-center lg:py-20 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-12">
        {/* Reliéf omítky pod textem – jen naznačený, viz `.texture-hero-panel`
            v globals.css. `-z-10` uvnitř `isolate` ho drží pod obsahem.
            Záporný spodní okraj protahuje texturu skrz spodní odsazení sekce,
            jinak by nad kartou kategorií vznikla viditelná vodorovná hrana. */}
        <div
          aria-hidden="true"
          className="texture-hero-panel absolute inset-0 -bottom-28 -z-10 lg:-bottom-36"
        />

        {/* /50 dávalo na krému jen 3,1:1 – pod normou i bez textury. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-linda-espresso/70">
          Nová kolekce
        </p>

        {/* Mezi 1024 a 1280 px má textový sloupec jen ~430 px, na 60 px se
            titulek lámal na tři řádky – v tom pásmu proto jede na 48 px.
            Ruční zalomení platí až od `sm`; na mobilu se text láme sám. */}
        <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-linda-espresso sm:text-6xl lg:text-5xl xl:text-6xl">
          Nadčasová elegance
          <br className="hidden sm:block" />{' '}
          pro každý den
        </h1>

        <p className="mt-6 max-w-md text-base leading-relaxed text-linda-espresso/70">
          Kousky z tradičních italských dílen. Přírodní materiály, poctivé krejčovství a
          styl, který vydrží roky.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/produkty"
            className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-8 py-4 text-sm font-medium text-linda-cream transition-colors duration-200 hover:bg-linda-cognac"
          >
            Prohlédnout kolekci
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/o-mne"
            className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-3 rounded-full text-sm font-medium text-linda-espresso transition-colors duration-200 hover:text-linda-cognacHover"
          >
            {/* Původně tu byla ikona přehrávání, odkaz ale vede na textovou
                stránku – šipka slibuje to, co se opravdu stane. */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-linda-espresso/25 transition-colors duration-200 group-hover:border-linda-cognac group-hover:bg-linda-cognac group-hover:text-white">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </span>
            Příběh značky
          </Link>
        </div>

        {/* Výhody. Tři sloupce jedou jen tam, kde na ně je místo – mezi 1024
            a 1280 px je textový panel úzký a popisky se lámaly i uvnitř ceny
            („2 / 500 Kč“), proto tam jdou výhody pod sebe. */}
        <div className="mt-12 border-t border-linda-sand pt-6">
          <ul className="grid grid-cols-1 divide-y divide-linda-sand sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y xl:grid-cols-3 xl:divide-x xl:divide-y-0">
            {VYHODY.slice(0, 3).map((vyhoda) => {
              const Ikona = IKONY[vyhoda.icon];

              return (
                <li
                  key={vyhoda.title}
                  className="flex items-start gap-3 py-3 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0 lg:px-0 lg:py-2.5 xl:px-4 xl:py-0"
                >
                  <Ikona className="h-5 w-5 shrink-0 text-linda-espresso/60" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-linda-espresso">
                      {vyhoda.title}
                    </span>
                    {/* /60 = 4,18:1, těsně pod normou – zvednuto na /75 */}
                    <span className="block text-xs text-linda-espresso/75">
                      {vyhoda.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  </section>
);
