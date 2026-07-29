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
      <div className="border-b border-[#E4D9C8] pb-8 space-y-3">
        <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block">
          Italská dámská móda
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#2B2019]">
          {activeCategory ? `Kolekce: ${activeCategory}` : 'Kompletní katalog kolekcí'}
        </h1>
        {searchQuery && (
          <p className="text-sm text-[#2B2019]/70">
            Výsledky vyhledávání pro: &bdquo;<span className="font-semibold text-[#7A4B32]">{searchQuery}</span>&ldquo;
          </p>
        )}
      </div>

      {/* Filter and Content Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar filters */}
        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/60 shadow-card space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E4D9C8]/60 pb-3">
              <SlidersHorizontal className="w-4 h-4 text-[#7A4B32]" />
              <h3 className="font-serif text-xl text-[#2B2019]">Kategorie</h3>
            </div>

            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/produkty"
                  className={`block py-1.5 px-3 rounded-lg transition-colors ${
                    !activeCategory ? 'bg-[#7A4B32] text-white font-medium' : 'text-[#2B2019] hover:bg-[#FAF8F4]'
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
                    className={`block py-1.5 px-3 rounded-lg transition-colors ${
                      activeCategory === cat.slug
                        ? 'bg-[#7A4B32] text-white font-medium'
                        : 'text-[#2B2019] hover:bg-[#FAF8F4]'
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
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E4D9C8]/60 text-xs text-[#2B2019]/70">
            <span>Nalezeno {filteredProducts.length} modelů</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#7A4B32]" />
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
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E4D9C8] p-8 space-y-4">
              <Filter className="w-10 h-10 text-[#7A4B32] mx-auto opacity-50" />
              <h3 className="font-serif text-2xl text-[#2B2019]">Nenalezeny žádné produkty</h3>
              <p className="text-xs text-[#2B2019]/60">Zkuste změnit vyhledávání nebo zvolit jinou kategorii.</p>
              <Link
                href="/produkty"
                className="inline-block px-6 py-2.5 bg-[#7A4B32] text-white text-xs font-semibold rounded-full hover:bg-[#633B26]"
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
