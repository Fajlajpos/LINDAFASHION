'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Sparkles, ShieldCheck, Truck, RotateCcw, Ruler, Check, AlertCircle, Gift } from 'lucide-react';

export default function DetailProduktPage({ params }: { params: { slug: string } }) {
  const [selectedVariant, setSelectedVariant] = useState<string>('v1');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Mock data produktu podle slugu
  const isGiftCard = params.slug.includes('darkovy-poukaz');

  const product = {
    id: 'p1',
    nazev: isGiftCard ? 'Dárkový poukaz LINDA FASHION' : 'Hedvábné šaty Bellissima',
    slug: params.slug,
    cena: isGiftCard ? 1000 : 3490,
    znacka: isGiftCard ? 'LINDA FASHION' : 'Milano Elegance',
    material: isGiftCard ? 'Luxusní tvrzený papír s pečetí' : '100% Přírodní italské hedvábí',
    udrzba: isGiftCard ? null : 'Šetrné ruční praní na 30°C nebo čistírna.',
    popis: isGiftCard
      ? 'Předat radost z italské módy nebylo nikdy jednodušší. Luxusní fyzická dárková karta tištěná na tvrdém papíru v dárkové obálce se zapečetěným věnováním.'
      : 'Nádherné zavinovací šaty z čistého italského hedvábí. Splývavý střih s jemným pasovým páskem zdůrazní siluetu a dodá pocit naprosté lehkosti a exkluzivity.',
    jeDarkovyPoukaz: isGiftCard,
    variants: isGiftCard
      ? [
          { id: 'v1', velikost: '500 Kč', skladem: 100, miry: undefined },
          { id: 'v2', velikost: '1000 Kč', skladem: 100, miry: undefined },
          { id: 'v3', velikost: '2000 Kč', skladem: 100, miry: undefined },
          { id: 'v4', velikost: '5000 Kč', skladem: 100, miry: undefined },
        ]
      : [
          {
            id: 'v1',
            velikost: 'S (36)',
            skladem: 3,
            miry: { obvodHrudniku: '88–92 cm', obvodPasu: '68–72 cm', obvodBoku: '94–98 cm', delka: '115 cm' },
          },
          {
            id: 'v2',
            velikost: 'M (38)',
            skladem: 5,
            miry: { obvodHrudniku: '92–96 cm', obvodPasu: '72–76 cm', obvodBoku: '98–102 cm', delka: '116 cm' },
          },
          {
            id: 'v3',
            velikost: 'L (40)',
            skladem: 0, // Vyprodáno pro test "Upozornit skladem"
            miry: { obvodHrudniku: '96–100 cm', obvodPasu: '76–80 cm', obvodBoku: '102–106 cm', delka: '117 cm' },
          },
        ],
  };

  const activeVariant = product.variants.find((v) => v.id === selectedVariant) || product.variants[0];

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Breadcrumb nav */}
      <nav className="text-xs text-[#2B2019]/60 flex items-center space-x-2">
        <Link href="/" className="hover:text-[#7A4B32]">
          Domů
        </Link>
        <span>/</span>
        <Link href="/produkty" className="hover:text-[#7A4B32]">
          Katalog
        </Link>
        <span>/</span>
        <span className="text-[#7A4B32] font-medium">{product.nazev}</span>
      </nav>

      {/* Main product view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left column: Photo Gallery with graphical placeholder */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[3/4] bg-gradient-to-b from-[#FAF8F4] to-[#F3EFE9] rounded-3xl border border-[#E4D9C8]/80 overflow-hidden flex flex-col items-center justify-center p-8 text-center shadow-card">
            <div className="w-24 h-24 rounded-full bg-[#E4D9C8]/40 flex items-center justify-center mb-4">
              {product.jeDarkovyPoukaz ? (
                <Gift className="w-12 h-12 text-[#7A4B32] stroke-[1.5]" />
              ) : (
                <Sparkles className="w-12 h-12 text-[#7A4B32] stroke-[1.5]" />
              )}
            </div>
            <span className="font-serif text-3xl text-[#2B2019]">LINDA FASHION</span>
            <span className="text-xs uppercase tracking-widest text-[#7A4B32] mt-1 font-medium">
              Moda Italiana &bull; Pečlivě Vybráno v Itálii
            </span>
          </div>
        </div>

        {/* Right column: Product Specs & Actions */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block mb-1">
              {product.znacka}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019] leading-tight">{product.nazev}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-[#2B2019]">
                {product.cena.toLocaleString('cs-CZ')} Kč
              </span>
              <span className="text-xs text-[#6B7255] font-medium bg-[#F0F2EC] px-2.5 py-1 rounded-full">
                Skladem &bull; Ihned k odeslání
              </span>
            </div>
          </div>

          <p className="text-sm text-[#2B2019]/80 font-light leading-relaxed">{product.popis}</p>

          {/* Size / Variant Selector */}
          <div className="space-y-3 pt-4 border-t border-[#E4D9C8]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#2B2019]">
                {product.jeDarkovyPoukaz ? 'Zvolte hodnotu poukazu:' : 'Zvolte velikost:'}
              </span>
              {!product.jeDarkovyPoukaz && (
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs text-[#7A4B32] hover:underline flex items-center gap-1 font-medium"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Tabulka mír a průvodce
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {product.variants.map((v) => {
                const isOutOfStock = v.skladem === 0;
                const isSelected = v.id === selectedVariant;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                      isSelected
                        ? 'border-[#7A4B32] bg-[#7A4B32] text-white shadow-sm'
                        : isOutOfStock
                        ? 'border-[#E4D9C8] bg-gray-100 text-gray-400 line-through'
                        : 'border-[#E4D9C8] bg-white text-[#2B2019] hover:border-[#7A4B32]'
                    }`}
                  >
                    {v.velikost}
                    {v.skladem > 0 && v.skladem <= 2 && (
                      <span className="block text-[9px] text-amber-600 font-normal">Poslední kousky!</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Measurements Box (hidden for Gift Cards as required by Section 6.2!) */}
          {!product.jeDarkovyPoukaz && activeVariant.miry && (
            <div className="p-4 bg-[#white] rounded-2xl border border-[#E4D9C8]/80 space-y-2 text-xs">
              <h4 className="font-semibold text-[#2B2019] uppercase tracking-wider">
                Přesné míry pro velikost {activeVariant.velikost}:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[#2B2019]/80">
                {Object.entries(activeVariant.miry).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-[#E4D9C8]/30 py-1">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-medium text-[#7A4B32]">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Material & Care */}
          {product.material && (
            <div className="space-y-1 text-xs text-[#2B2019]/80">
              <span className="font-semibold uppercase tracking-wider text-[#2B2019] block">Materiál &amp; Péče:</span>
              <p>Materiál: {product.material}</p>
              {product.udrzba && <p>Péče: {product.udrzba}</p>}
            </div>
          )}

          {/* Action CTA Buttons */}
          <div className="space-y-3 pt-4 border-t border-[#E4D9C8]/60">
            {activeVariant.skladem > 0 ? (
              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-[#7A4B32] text-white text-sm font-semibold rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2"
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Přidáno do košíku!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Přidat do košíku
                  </>
                )}
              </button>
            ) : (
              <div className="p-4 bg-[#FAF8F4] border border-[#7A4B32]/30 rounded-2xl text-center space-y-2">
                <p className="text-xs text-[#7A4B32] font-semibold flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Tato velikost je momentálně vyprodaná
                </p>
                <button className="px-4 py-2 bg-[#2B2019] text-white text-xs font-medium rounded-full hover:bg-[#7A4B32] transition-colors">
                  Upozornit, až bude skladem
                </button>
              </div>
            )}

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-full py-3 border border-[#2B2019]/30 text-[#2B2019] text-xs font-semibold rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32] transition-colors flex items-center justify-center gap-2"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#7A4B32] text-[#7A4B32]' : ''}`} />
              {isFavorite ? 'Uloženo v oblíbených' : 'Uložit mezi oblíbené'}
            </button>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-[#2B2019]/70 pt-4 border-t border-[#E4D9C8]/40">
            <div className="flex flex-col items-center">
              <Truck className="w-5 h-5 text-[#7A4B32] mb-1" />
              <span>Doručení do 2 dnů</span>
            </div>
            <div className="flex flex-col items-center">
              <RotateCcw className="w-5 h-5 text-[#7A4B32] mb-1" />
              <span>14 dní na vyzkoušení</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-[#7A4B32] mb-1" />
              <span>Bezpečná platba</span>
            </div>
          </div>
        </div>
      </div>

      {/* Size guide modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 relative border border-[#E4D9C8]">
            <h3 className="font-serif text-2xl text-[#2B2019]">Průvodce velikostmi &amp; jak se měřit</h3>
            <p className="text-xs text-[#2B2019]/80 leading-relaxed">
              Italské velikosti odpovídají evropskému číslování. Vždy se měřte krejčovským metrem přímo na těle bez přitažení:
            </p>
            <ul className="text-xs space-y-1.5 list-disc pl-4 text-[#2B2019]/70">
              <li><strong>Hrudník:</strong> přes nejplnější místo prsou</li>
              <li><strong>Pas:</strong> v nejsužším místě nad pupíkem</li>
              <li><strong>Boky:</strong> přes nejširší část hýždí</li>
            </ul>
            <button
              onClick={() => setShowSizeGuide(false)}
              className="w-full py-2 bg-[#7A4B32] text-white text-xs font-semibold rounded-full"
            >
              Rozumím
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
