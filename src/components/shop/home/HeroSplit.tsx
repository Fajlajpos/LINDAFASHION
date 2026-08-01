import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Package, Truck } from 'lucide-react';
import { MediaFrame } from './MediaFrame';

/**
 * Úvodní editorial hero: text vlevo na krémové ploše, fotografie vpravo
 * na spad k pravému okraji obrazovky.
 *
 * Na mobilu jde fotografie první a text pod ni – palec tak má tlačítka
 * v dosahu a snímek nesnižuje čitelnost titulku.
 */
export const HeroSplit: React.FC = () => (
  /* Obě poloviny (textura vlevo, fotka vpravo) končí přesně na hraně sekce.
     Dřív měla každá jiný mechanismus (`h-full` vs. záporný margin) a při
     nízkém okně se rozešly až o 122 px. */
  <section className="relative overflow-hidden bg-linda-cream">
    <div className="lg:grid lg:grid-cols-12 lg:items-stretch">
      {/* Fotografie – na mobilu nahoře, na lg vpravo v mřížce (col 7–12) */}
      {/* 88vh tlačilo na notebooku s 768px výšky pod ohyb i hlavní tlačítko;
          76vh nechá pod herem vykouknout začátek další sekce, což je zároveň
          pozvánka ke skrolování.

          Poměr 4/5 platí jen na telefonu (na 375 px = 469 px, rozumné). Na
          tabletu by z něj bylo 960 px a první obrazovka by byla čistě fotka
          bez jediného slova – od `sm` proto jede na šířku. */}
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:aspect-auto lg:h-full lg:min-h-[76vh]">
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
      {/* Spodní `pb` drží text nad kartou kategorií, která se sem zespoda
          zanořuje (`-mt-14` / `lg:-mt-16`). Karta je vysoká ~104 px, takže
          96 / 128 px odsazení jí nechá dost místa a text se pod ni nedostane. */}
      <div className="relative isolate px-4 pb-24 pt-12 sm:px-6 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-center lg:py-20 lg:pb-32 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-12">
        {/* Reliéf omítky pod textem – jen naznačený, viz `.texture-hero-panel`
            v globals.css. `-z-10` uvnitř `isolate` ho drží pod obsahem. */}
        <div aria-hidden="true" className="texture-hero-panel absolute inset-0 -z-10" />

        {/* /50 dávalo na krému jen 3,1:1 – pod normou i bez textury. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-linda-espresso/70">
          Nová kolekce
        </p>

        {/* Mezi 1024 a 1280 px má textový sloupec jen ~430 px, na 60 px se
            titulek lámal na tři řádky – v tom pásmu proto jede na 48 px.
            Ruční zalomení platí až od `sm`; na mobilu se text láme sám. */}
        {/* Na `xl` jde titulek až na 72 px: Cormorant je displejové písmo,
            ve 48 px působí krotce, a proti nadpisům sekcí (36 px) teprve
            takhle vzniká hierarchie, ve které hero opravdu vede. */}
        <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-linda-espresso sm:text-6xl lg:text-5xl xl:text-7xl">
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
            className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-8 py-4 text-sm font-medium text-linda-cream shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
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
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linda-cream shadow-neu transition-all duration-200 group-hover:bg-linda-cognac group-hover:text-white group-hover:shadow-neuSm">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </span>
            Příběh značky
          </Link>
        </div>

        {/* Nákupní jistoty jen jako jeden tichý řádek.
            Dřív tu stál třísloupcový výčet `VYHODY.slice(0, 3)`, jenže tytéž
            položky nese `TrustBar` níž na stránce – „Doprava zdarma“ i
            „Vrácení do 14 dnů“ tak byly na homepage dvakrát, jen jinak
            nastylované. Ujištění nad ohybem má cenu, opakování ne: zůstala
            jedna řádka, hero se zkrátil a duplicita zmizela.
            Nezlomitelné mezery drží „2 500 Kč“ i „14 dnů“ pohromadě. */}
        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-linda-sand pt-6 text-xs text-linda-espresso/75">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
            Doprava zdarma nad 2 500 Kč
          </span>
          <span aria-hidden="true" className="hidden h-3 w-px bg-linda-sand sm:block" />
          <span className="inline-flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
            Vrácení do 14 dnů
          </span>
        </div>
      </div>
    </div>
  </section>
);
