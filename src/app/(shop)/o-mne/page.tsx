import React from 'react';
import Link from 'next/link';
import { Heart, Sparkles, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

export default function OMnePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block">
          Příběh značky LINDA FASHION
        </span>
        <h1 className="font-serif text-4xl sm:text-6xl text-[#2B2019] leading-tight">
          &bdquo;Miluji módu, která má duši, příběh a poctivé remeslo.&ldquo;
        </h1>
        <p className="text-base text-[#2B2019]/70 font-light italic font-serif">
          Vítejte v mém osobním světě italské elegance.
        </p>
      </div>

      {/* Main image placeholder (no AI images used, pure graphical styled placeholder) */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#FAF8F4] via-[#F3EFE9] to-[#E4D9C8]/40 rounded-3xl border border-[#E4D9C8] overflow-hidden shadow-elevated flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-[#FAF8F4] border border-[#7A4B32]/30 flex items-center justify-center shadow-sm">
          <Heart className="w-10 h-10 text-[#7A4B32] fill-[#7A4B32]/20 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-2xl text-[#2B2019]">Fotografie z italského showroomu a cesty majitelky</h3>
          <p className="text-xs text-[#7A4B32] font-medium">
            (Skutečné fotografie majitelky Lindy doplníme ihned po dokončení nového focení)
          </p>
        </div>
      </div>

      {/* Narrative content in 1st person */}
      <div className="prose prose-stone max-w-none space-y-8 text-sm text-[#2B2019]/80 font-light leading-relaxed">
        <div className="space-y-4">
          <h2 className="font-serif text-3xl text-[#2B2019] font-normal border-b border-[#E4D9C8] pb-3">
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
          <div className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-3">
            <Sparkles className="w-6 h-6 text-[#7A4B32]" />
            <h3 className="font-serif text-xl text-[#2B2019]">Můj výběr materiálů</h3>
            <p className="text-xs text-[#2B2019]/70 leading-relaxed">
              Všechny modely osobně prozkoumám a vyzkouším. Vyhledávám 100% přírodní hedvábí, toskánský len, jemný kašmír a kvalitní merino vlnu.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-3">
            <Heart className="w-6 h-6 text-[#7A4B32]" />
            <h3 className="font-serif text-xl text-[#2B2019]">Osobní přístup</h3>
            <p className="text-xs text-[#2B2019]/70 leading-relaxed">
              Pro mě nejste anonymní číslo v systému. Ráda vám poradím s výběrem mír i kombinací a každé balení připravuji s osobním vzkazem.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-3xl text-[#2B2019] font-normal border-b border-[#E4D9C8] pb-3">
            Vřelá atmosféra rodinného butiku
          </h2>
          <p>
            Věřím, že nákup nového oblečení by měl být malým svátkem a radostí. Ať už si prohlížíte náš e-shop z pohodlí domova, nebo nás kontaktujete s dotazem na velikost, mým cílem je, abyste se cítila opečovávaná a jako u dobré kamarádky.
          </p>
        </div>
      </div>

      {/* CTA Bottom Banner */}
      <div className="p-8 sm:p-12 bg-[#2B2019] text-[#FAF8F4] rounded-3xl text-center space-y-4">
        <h3 className="font-serif text-3xl text-[#E4D9C8]">Prohlédněte si nejnovější italskou kolekci</h3>
        <p className="text-xs text-[#FAF8F4]/70 max-w-md mx-auto">
          Každý model naskladňujeme pouze v limitovaném počtu kusů pro zachování exkluzivity.
        </p>
        <div>
          <Link
            href="/produkty"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-colors"
          >
            Objevit nové kousky
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
