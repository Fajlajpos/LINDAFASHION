import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Package, Truck } from 'lucide-react';
import { MediaFrame } from './MediaFrame';

/**
 * Úvodní hero: fotografie přes celou plochu, sdělení na vyvýšené kartě.
 *
 * Předchozí verze byly obě dvousloupcové – text vedle fotky. Tahle staví
 * jinak: snímek nese celou sekci a text stojí na krémové kartě, která na něm
 * leží. Skladba je bližší obálce magazínu než rozdělené stránce a fotografie,
 * což je u módy to hlavní, dostane celou plochu místo poloviny.
 *
 * Karta mluví jazykem zbytku stránky: krémová jako podklad, `rounded-3xl`
 * a `shadow-neuLg`, tedy stejný poloměr i reliéf jako karta kategorií pod ní.
 * Na `lg` zabírá levou třetinu, takže vpravo zůstane snímek celý vidět.
 *
 * Na mobilu je nad kartou 260 px snímku – kompozice zůstane čitelná a text
 * má palec v dosahu.
 */
export const HeroSplit: React.FC = () => (
  <section className="relative isolate overflow-hidden bg-linda-cream">
    {/* Fotografie leží pod obsahem.
        Na `lg` vyplní celou sekci. Pod ním je z ní jen pruh u horní hrany:
        sekce je tam přes 900 px vysoká a v tak úzkém svislém výřezu by
        `object-cover` přiblížil snímek na detail obličeje – z šatů, tedy
        z toho, co prodáváme, by nezbylo nic. */}
    <div className="absolute inset-x-0 top-0 -z-10 h-[420px] sm:h-[540px] lg:inset-0 lg:h-auto">
      <MediaFrame
        src="/hero-editorial.jpg"
        alt="Žena v lněných šatech z italské kolekce"
        sizes="100vw"
        priority
        objectPosition="object-[58%_20%] lg:object-[72%_18%]"
      />

      {/* Jemné ztmavení dolní hrany. Karta kategorií se sem zespoda zanořuje
          a na přesvětleném místě by její měkký stín zanikl. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-gradient-to-t from-linda-espresso/25 via-transparent to-transparent lg:block"
      />

      {/* Pod `lg` končí pruh uprostřed stránky – prolnutí do krémové schová
          vodorovný řez, který by jinak vykukoval vedle karty. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-linda-cream to-transparent lg:hidden"
      />
    </div>

    <div className="mx-auto max-w-7xl px-4 pb-24 pt-[250px] sm:px-6 sm:pt-[330px] lg:px-8 lg:pb-32 lg:pt-36">
      {/* Karta je neprůhledná, ne skleněná: text tak nikdy nezávisí na tom,
          co je zrovna pod ním, a kontrast drží bez ohledu na výřez fotky. */}
      <div className="max-w-xl rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10 lg:p-12">
        {/* /50 dávalo na krému jen 3,1:1 – pod normou. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-linda-espresso/70">
          Nová kolekce
        </p>

        {/* Cormorant je displejové písmo, ve 48 px působí krotce. Proti
            nadpisům sekcí (36 px) teprve tahle velikost dělá hierarchii,
            ve které hero opravdu vede. Ruční zalomení až od `sm`;
            na mobilu se text láme sám. */}
        <h1 className="mt-6 font-serif text-4xl leading-[1.05] text-linda-espresso sm:text-5xl lg:text-6xl">
          Nadčasová elegance
          <br className="hidden sm:block" />{' '}
          pro každý den
        </h1>

        <p className="mt-6 text-base leading-relaxed text-linda-espresso/70">
          Kousky z tradičních italských dílen. Přírodní materiály, poctivé krejčovství a
          styl, který vydrží roky.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/produkty"
            className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-8 py-4 text-sm font-medium text-linda-cream shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
          >
            Prohlédnout kolekci
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/o-mne"
            className="group inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-3 rounded-full text-sm font-medium text-linda-espresso transition-colors duration-200 hover:text-linda-cognacHover"
          >
            {/* Šipka slibuje to, co se opravdu stane – odkaz vede na textovou
                stránku, ne na video. */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linda-cream shadow-neu transition-all duration-200 group-hover:bg-linda-cognac group-hover:text-white group-hover:shadow-neuSm">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </span>
            Příběh značky
          </Link>
        </div>

        {/* Nákupní jistoty jen jako jeden tichý řádek – tytéž položky nese
            `TrustBar` níž na stránce, opakovat celý výčet dvakrát nemá smysl.
            Nezlomitelné mezery drží „2 500 Kč“ i „14 dnů“ pohromadě. */}
        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-linda-sand pt-6 text-xs text-linda-espresso/75">
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
