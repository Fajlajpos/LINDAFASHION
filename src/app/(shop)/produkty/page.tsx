import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface ProduktyPageProps {
  searchParams: {
    kategorie?: string;
    search?: string;
    sort?: string;
    maxPrice?: string;
  };
}

export default async function ProduktyPage({ searchParams }: ProduktyPageProps) {
  // Ukázková data produktů katalogu
  const allProducts = [
    {
      id: 'p1',
      nazev: 'Hedvábné šaty Bellissima',
      slug: 'hedvabne-saty-bellissima',
      cena: 3490,
      znacka: 'Milano Elegance',
      kategorieNazev: 'Šaty',
      kategorieSlug: 'saty',
      doporuceny: true,
    },
    {
      id: 'p2',
      nazev: 'Lněná halenka Firenze',
      slug: 'lnena-halenka-firenze',
      cena: 1890,
      znacka: 'Toscana Style',
      kategorieNazev: 'Halenky & Košile',
      kategorieSlug: 'halenky-a-kosile',
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
      kategorieSlug: 'svetry-a-kardigany',
      doporuceny: true,
    },
    {
      id: 'p4',
      nazev: 'Vlněný kabát Venezia',
      slug: 'vlneny-kabat-venezia',
      cena: 5490,
      znacka: 'Venezia Tailoring',
      kategorieNazev: 'Saka & Kabáty',
      kategorieSlug: 'saka-a-kabaty',
      doporuceny: true,
    },
    {
      id: 'p5',
      nazev: 'Dárkový poukaz LINDA FASHION',
      slug: 'darkovy-poukaz-linda-fashion',
      cena: 1000,
      kategorieNazev: 'Dárkové poukazy',
      kategorieSlug: 'darkove-poukazy',
      jeDarkovyPoukaz: true,
    },
  ];

  const activeCategory = searchParams.kategorie;
  const searchQuery = searchParams.search;

  const filteredProducts = allProducts.filter((p) => {
    if (activeCategory && p.kategorieSlug !== activeCategory) return false;
    if (searchQuery && !p.nazev.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
          Italská dámská móda
        </span>
        <h1 className="font-serif text-4xl text-linda-espresso sm:text-5xl">
          {activeCategory ? `Kolekce: ${activeCategory}` : 'Kompletní katalog kolekcí'}
        </h1>
        {searchQuery && (
          <p className="text-sm text-linda-espresso/70">
            Výsledky vyhledávání pro: &bdquo;<span className="font-semibold text-linda-cognac">{searchQuery}</span>&ldquo;
          </p>
        )}
      </div>

      {/* Filter and Content Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar filters */}
        <aside className="space-y-6">
          <div className="space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <div className="flex items-center gap-2 border-b border-linda-sand/60 pb-3">
              <SlidersHorizontal className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
              <h2 className="font-serif text-xl text-linda-espresso">Kategorie</h2>
            </div>

            {/* Aktivní filtr je zamáčknutý do panelu (prohlubeň), neaktivní
                leží v rovině a při hoveru se lehce nadzvedne. Stav tak nese
                i tvar, ne jen barva. */}
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/produkty"
                  aria-current={!activeCategory ? 'page' : undefined}
                  className={`flex min-h-touch cursor-pointer items-center rounded-lg px-3 transition-all duration-200 ${
                    !activeCategory
                      ? 'bg-linda-cognac font-medium text-white shadow-neuOnDarkInset'
                      : 'text-linda-espresso hover:shadow-neuSm'
                  }`}
                >
                  Všechny produkty ({allProducts.length})
                </Link>
              </li>
              {[
                { name: 'Šaty', slug: 'saty', count: 1 },
                { name: 'Halenky & Košile', slug: 'halenky-a-kosile', count: 1 },
                { name: 'Svetry & Kardigany', slug: 'svetry-a-kardigany', count: 1 },
                { name: 'Saka & Kabáty', slug: 'saka-a-kabaty', count: 1 },
                { name: 'Dárkové poukazy', slug: 'darkove-poukazy', count: 1 },
              ].map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/produkty?kategorie=${cat.slug}`}
                    aria-current={activeCategory === cat.slug ? 'page' : undefined}
                    className={`flex min-h-touch cursor-pointer items-center rounded-lg px-3 transition-all duration-200 ${
                      activeCategory === cat.slug
                        ? 'bg-linda-cognac font-medium text-white shadow-neuOnDarkInset'
                        : 'text-linda-espresso hover:shadow-neuSm'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Product listing grid */}
        <main className="lg:col-span-3 space-y-6">
          {/* Informační lišta – ne ovládací prvek, proto prohlubeň (leží
              v ploše) místo vystouplé karty. */}
          <div className="flex items-center justify-between rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/75 shadow-neuInsetSm">
            <span>Nalezeno {filteredProducts.length} modelů</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
              <span>Řazení: Nejnovější</span>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl bg-linda-cream p-8 py-16 text-center shadow-neu">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sandLight shadow-neuInset">
                <Filter className="h-7 w-7 text-linda-cognac" aria-hidden="true" />
              </span>
              <h2 className="font-serif text-2xl text-linda-espresso">Nenalezeny žádné produkty</h2>
              <p className="text-xs text-linda-espresso/70">Zkuste změnit vyhledávání nebo zvolit jinou kategorii.</p>
              <Link
                href="/produkty"
                className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                Zobrazit vše
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
