import React from 'react';
import Link from 'next/link';
import { Heart, Sparkles, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

export default function OMnePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header section */}
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Příběh značky LINDA FASHION
        </span>
        <h1 className="font-serif text-4xl leading-tight text-linda-espresso sm:text-6xl">
          &bdquo;Miluji módu, která má duši, příběh a poctivé remeslo.&ldquo;
        </h1>
        <p className="font-serif text-base font-light italic text-linda-espresso/75">
          Vítejte v mém osobním světě italské elegance.
        </p>
      </div>

      {/* Main image placeholder (no AI images used, pure graphical styled placeholder).
          Rám je prohlubeň – snímek do stránky patří vsazený, ne nalepený. */}
      <div className="relative flex aspect-[16/9] flex-col items-center justify-center space-y-4 overflow-hidden rounded-3xl bg-linda-sandLight p-8 text-center shadow-neuInset">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linda-cream shadow-neu">
          <Heart className="h-10 w-10 fill-linda-cognac/20 stroke-[1.5] text-linda-cognac" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-serif text-2xl text-linda-espresso">Fotografie z italského showroomu a cesty majitelky</p>
          <p className="text-xs font-medium text-linda-cognac">
            (Skutečné fotografie majitelky Lindy doplníme ihned po dokončení nového focení)
          </p>
        </div>
      </div>

      {/* Narrative content in 1st person */}
      <div className="prose prose-stone max-w-none space-y-8 text-sm font-light leading-relaxed text-linda-espresso/80">
        <div className="space-y-4">
          <h2 className="border-b border-linda-sand pb-3 font-serif text-3xl font-normal text-linda-espresso">
            Jak to celé začalo
          </h2>
          <p>
            Můj vztah k Itálii a její módní kultuře nevznikl ze dne na den. Vždy mě fascinovalo, s jakou lehkostí a přirozeným půvabem se italské ženy oblékají. Nesledují slepě pomíjivé trendy rychlé módy – místo toho si vybírají kousky z poctivých materiálů, které perfektně sedí a vydrží v šatníku roky.
          </p>
          <p>
            Rozhodla jsem se tuto filozofii přinést i k nám. Založila jsem <strong>LINDA FASHION</strong> s jasným cílem: nabízet oblečení dovážené přímo z menších italských rodinných dílen v Toskánsku, Miláně a Římě.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
              <Sparkles className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-xl text-linda-espresso">Můj výběr materiálů</h3>
            <p className="text-xs leading-relaxed text-linda-espresso/75">
              Všechny modely osobně prozkoumám a vyzkouším. Vyhledávám 100% přírodní hedvábí, toskánský len, jemný kašmír a kvalitní merino vlnu.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
              <Heart className="h-6 w-6 text-linda-cognac" aria-hidden="true" />
            </span>
            <h3 className="font-serif text-xl text-linda-espresso">Osobní přístup</h3>
            <p className="text-xs leading-relaxed text-linda-espresso/75">
              Pro mě nejste anonymní číslo v systému. Ráda vám poradím s výběrem mír i kombinací a každé balení připravuji s osobním vzkazem.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="border-b border-linda-sand pb-3 font-serif text-3xl font-normal text-linda-espresso">
            Vřelá atmosféra rodinného butiku
          </h2>
          <p>
            Věřím, že nákup nového oblečení by měl být malým svátkem a radostí. Ať už si prohlížíte náš e-shop z pohodlí domova, nebo nás kontaktujete s dotazem na velikost, mým cílem je, abyste se cítila opečovávaná a jako u dobré kamarádky.
          </p>
        </div>
      </div>

      {/* CTA Bottom Banner */}
      <div className="space-y-4 rounded-3xl bg-linda-espresso p-8 text-center text-linda-cream shadow-neuLg sm:p-12">
        <h2 className="font-serif text-3xl text-linda-sand">Prohlédněte si nejnovější italskou kolekci</h2>
        <p className="mx-auto max-w-md text-xs text-linda-cream/75">
          Každý model naskladňujeme pouze v limitovaném počtu kusů pro zachování exkluzivity.
        </p>
        <div>
          <Link
            href="/produkty"
            className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuOnDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuOnDarkInset"
          >
            Objevit nové kousky
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
