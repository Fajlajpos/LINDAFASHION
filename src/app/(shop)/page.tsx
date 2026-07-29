import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { ArrowRight, Heart } from 'lucide-react';

export default async function HomePage() {
  // Ukázkové produkty pro homepage
  const featuredProducts = [
    {
      id: 'p1',
      nazev: 'Hedvábné šaty Bellissima',
      slug: 'hedvabne-saty-bellissima',
      cena: 3490,
      znacka: 'Milano Elegance',
      kategorieNazev: 'Šaty',
      doporuceny: true,
    },
    {
      id: 'p2',
      nazev: 'Lněná halenka Firenze',
      slug: 'lnena-halenka-firenze',
      cena: 1890,
      znacka: 'Toscana Style',
      kategorieNazev: 'Halenky & Košile',
      doporuceny: false,
    },
    {
      id: 'p3',
      nazev: 'Kašmírový svetr Roma',
      slug: 'kasmirovy-svetr-roma',
      cena: 2990,
      cenaPoSleve: 2390,
      znacka: 'Roma Knitwear',
      kategorieNazev: 'Svetry & Kardigany',
      doporuceny: true,
    },
    {
      id: 'p4',
      nazev: 'Vlněný kabát Venezia',
      slug: 'vlneny-kabat-venezia',
      cena: 5490,
      znacka: 'Venezia Tailoring',
      kategorieNazev: 'Saka & Kabáty',
      doporuceny: true,
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero section s jemně průhlednou vlastností textury */}
      <section className="relative overflow-hidden texture-hero-user py-24 sm:py-32 border-b border-[#E4D9C8]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#2B2019] tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Nadčasová elegance a kvalita, která neztrácí půvab
          </h1>

          <p className="text-base sm:text-lg text-[#2B2019]/75 max-w-2xl mx-auto font-light leading-relaxed">
            Každý kus oblečení dovážíme přímo z tradičních italských dílen. Nepodléháme rychlé módě – věříme v prémiové přírodní materiály, osobní přístup a styl, ve kterém se budete cítit sama sebou.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/produkty"
              className="w-full sm:w-auto px-8 py-4 bg-[#7A4B32] text-white text-sm font-medium rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              Prohlédnout kolekci
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/o-mne"
              className="w-full sm:w-auto px-8 py-4 border border-[#2B2019]/30 text-[#2B2019] text-sm font-medium rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32] transition-all"
            >
              Příběh značky LINDA FASHION
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Showcase - Čisté elegantní karty bez textur */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Objevte naše kategorie</h2>
          <p className="text-xs sm:text-sm text-[#2B2019]/60 max-w-lg mx-auto">
            Od vzdušných hedvábných šatů po hřejivé kašmírové svetry z italských provincií.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Šaty', count: '14 modelů', slug: 'saty' },
            { title: 'Halenky & Košile', count: '9 modelů', slug: 'halenky-a-kosile' },
            { title: 'Svetry & Kašmír', count: '7 modelů', slug: 'svetry-a-kardigany' },
            { title: 'Dárkové poukazy', count: 'Fyzické karty', slug: 'darkove-poukazy' },
          ].map((cat, idx) => (
            <Link
              key={idx}
              href={`/produkty/${cat.slug}`}
              className="group p-8 rounded-2xl border border-[#E4D9C8] bg-[#FAF8F4] hover:border-[#7A4B32] hover:bg-white transition-all duration-300 flex flex-col justify-between h-48 shadow-card hover:shadow-elevated"
            >
              <div>
                <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block mb-1">
                  {cat.count}
                </span>
                <h3 className="font-serif text-2xl text-[#2B2019] group-hover:text-[#7A4B32] transition-colors">
                  {cat.title}
                </h3>
              </div>
              <div className="flex items-center text-xs font-medium text-[#2B2019]/70 group-hover:text-[#7A4B32] gap-1">
                <span>Zobrazit kousky</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4D9C8]/60 pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block mb-1">
              Vybrané s láskou
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Doporučené modely</h2>
          </div>
          <Link
            href="/produkty"
            className="text-sm font-medium text-[#7A4B32] hover:text-[#2B2019] flex items-center gap-1.5 group"
          >
            <span>Zobrazit celý katalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </section>

      {/* Personal Note Teaser / Brand Story - Čistý papírový podklad bez zrnité textury */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF8F4] border border-[#E4D9C8] rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-card grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#7A4B32]">
              <Heart className="w-4 h-4 fill-[#7A4B32]" />
              Osobní vzkaz zakladatelky
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl text-[#2B2019] leading-tight">
              &bdquo;Móda by měla být radostí z poctivého materiálu, ve kterém rozkvete každá žena.&ldquo;
            </h2>

            <p className="text-sm sm:text-base text-[#2B2019]/75 leading-relaxed font-light">
              Jmenuji se Linda a pro LINDA FASHION osobně vybírám každý model na svých cestách po Itálii. Nechci prodávat anonymní tisíce kusů – záleží mi na tom, aby oblečení skvěle padlo, vydrželo léta a vy jste se v něm cítila sebevědomá a milovaná.
            </p>

            <div>
              <Link
                href="/o-mne"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2B2019] text-[#E4D9C8] text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-[#7A4B32] transition-colors"
              >
                Přečíst celý příběh
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 bg-[#E4D9C8]/30 rounded-2xl border border-[#E4D9C8]/60 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#FAF8F4] border-2 border-[#7A4B32]/30 flex items-center justify-center shadow-inner">
              <span className="font-serif text-2xl text-[#7A4B32]">L</span>
            </div>
            <div>
              <h4 className="font-serif text-xl text-[#2B2019]">Linda</h4>
              <p className="text-xs text-[#7A4B32] font-medium">Zakladatelka LINDA FASHION</p>
            </div>
            <p className="text-xs text-[#2B2019]/60 italic">
              Fotografie Lindy a jejího butiku doplníme již brzy po otevření.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
