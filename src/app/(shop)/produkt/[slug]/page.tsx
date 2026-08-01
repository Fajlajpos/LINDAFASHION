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
      <nav aria-label="Drobečková navigace" className="flex items-center space-x-2 text-xs text-linda-espresso/70">
        <Link href="/" className="transition-colors hover:text-linda-cognac">
          Domů
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/produkty" className="transition-colors hover:text-linda-cognac">
          Katalog
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-linda-cognac">{product.nazev}</span>
      </nav>

      {/* Main product view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left column: Photo Gallery with graphical placeholder */}
        <div className="lg:col-span-7 space-y-4">
          {/* Fotka zatím chybí – místo ní značková výplň. Rám je prohlubeň:
              snímek do stránky patří vsazený, ne nalepený navrch. */}
          <div className="relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-3xl bg-linda-sandLight p-8 text-center shadow-neuInset">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-linda-cream shadow-neu">
              {product.jeDarkovyPoukaz ? (
                <Gift className="h-12 w-12 stroke-[1.5] text-linda-cognac" aria-hidden="true" />
              ) : (
                <Sparkles className="h-12 w-12 stroke-[1.5] text-linda-cognac" aria-hidden="true" />
              )}
            </div>
            <span className="font-serif text-3xl text-linda-espresso">LINDA FASHION</span>
            <span className="mt-1 text-xs font-medium uppercase tracking-widest text-linda-cognac">
              Moda Italiana &bull; Pečlivě Vybráno v Itálii
            </span>
          </div>
        </div>

        {/* Right column: Product Specs & Actions */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
              {product.znacka}
            </span>
            <h1 className="font-serif text-3xl leading-tight text-linda-espresso sm:text-4xl">{product.nazev}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-linda-espresso">
                {product.cena.toLocaleString('cs-CZ')} Kč
              </span>
              <span className="rounded-full bg-linda-sageLight px-2.5 py-1 text-xs font-medium text-linda-sage shadow-neuInsetSm">
                Skladem &bull; Ihned k odeslání
              </span>
            </div>
          </div>

          <p className="text-sm font-light leading-relaxed text-linda-espresso/80">{product.popis}</p>

          {/* Size / Variant Selector */}
          <div className="space-y-3 border-t border-linda-sand/60 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-linda-espresso">
                {product.jeDarkovyPoukaz ? 'Zvolte hodnotu poukazu:' : 'Zvolte velikost:'}
              </span>
              {!product.jeDarkovyPoukaz && (
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="flex min-h-touch cursor-pointer items-center gap-1 rounded-full px-1 text-xs font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
                >
                  <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                  Tabulka mír a průvodce
                </button>
              )}
            </div>

            {/* Zvolená velikost je zamáčknutá do plochy, ostatní vystupují.
                Vyprodaná je prohlubeň – šedá na šedé (dřív `bg-gray-100
                text-gray-400`, ~2,8:1) šla pryč a stav nese i přeškrtnutí. */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {product.variants.map((v) => {
                const isOutOfStock = v.skladem === 0;
                const isSelected = v.id === selectedVariant;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v.id)}
                    aria-pressed={isSelected}
                    className={`min-h-touch cursor-pointer rounded-xl px-2 py-3 text-center text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-linda-cognac text-white shadow-neuOnDarkInset'
                        : isOutOfStock
                        ? 'bg-linda-sandLight text-linda-espresso/60 line-through shadow-neuInsetSm'
                        : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:shadow-neu'
                    }`}
                  >
                    {v.velikost}
                    {v.skladem > 0 && v.skladem <= 2 && (
                      <span className="block text-[9px] font-normal text-linda-cognac">Poslední kousky!</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Measurements Box (hidden for Gift Cards as required by Section 6.2!) */}
          {!product.jeDarkovyPoukaz && activeVariant.miry && (
            /* `bg-[#white]` byla neplatná třída – panel neměl žádné pozadí.
               Teď je to prohlubeň s tabulkou, jako ostatní datové plochy. */
            <div className="space-y-2 rounded-2xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
              <h2 className="font-semibold uppercase tracking-wider text-linda-espresso">
                Přesné míry pro velikost {activeVariant.velikost}:
              </h2>
              <div className="grid grid-cols-2 gap-2 text-linda-espresso/80">
                {Object.entries(activeVariant.miry).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-linda-sand/40 py-1">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-medium text-linda-cognac">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Material & Care */}
          {product.material && (
            <div className="space-y-1 text-xs text-linda-espresso/80">
              <span className="block font-semibold uppercase tracking-wider text-linda-espresso">Materiál &amp; Péče:</span>
              <p>Materiál: {product.material}</p>
              {product.udrzba && <p>Péče: {product.udrzba}</p>}
            </div>
          )}

          {/* Action CTA Buttons */}
          <div className="space-y-3 border-t border-linda-sand/60 pt-4">
            {activeVariant.skladem > 0 ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-sm font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                {addedToCart ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden="true" />
                    Přidáno do košíku!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                    Přidat do košíku
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3 rounded-2xl bg-linda-sandLight p-4 text-center shadow-neuInsetSm">
                <p className="flex items-center justify-center gap-1 text-xs font-semibold text-linda-cognac">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Tato velikost je momentálně vyprodaná
                </p>
                <button
                  type="button"
                  className="min-h-touch cursor-pointer rounded-full bg-linda-espresso px-4 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
                >
                  Upozornit, až bude skladem
                </button>
              </div>
            )}

            {/* Uložený stav = zamáčknuté tlačítko; nese ho tvar i výplň
                srdíčka, ne pouze barva. */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              aria-pressed={isFavorite}
              className={`flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold transition-all duration-200 ${
                isFavorite
                  ? 'bg-linda-sandLight text-linda-cognac shadow-neuInsetSm'
                  : 'bg-linda-cream text-linda-espresso shadow-neuSm hover:text-linda-cognac hover:shadow-neu'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-linda-cognac text-linda-cognac' : ''}`}
                aria-hidden="true"
              />
              {isFavorite ? 'Uloženo v oblíbených' : 'Uložit mezi oblíbené'}
            </button>
          </div>

          {/* Guarantees */}
          <ul className="grid grid-cols-3 gap-2 border-t border-linda-sand/40 pt-4 text-center text-[10px] text-linda-espresso/75">
            {[
              { Ikona: Truck, text: 'Doručení do 2 dnů' },
              { Ikona: RotateCcw, text: '14 dní na vyzkoušení' },
              { Ikona: ShieldCheck, text: 'Bezpečná platba' },
            ].map(({ Ikona, text }) => (
              <li key={text} className="flex flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
                  <Ikona className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Size guide modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neuLg">
            <h2 className="font-serif text-2xl text-linda-espresso">Průvodce velikostmi &amp; jak se měřit</h2>
            <p className="text-xs leading-relaxed text-linda-espresso/80">
              Italské velikosti odpovídají evropskému číslování. Vždy se měřte krejčovským metrem přímo na těle bez přitažení:
            </p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-linda-espresso/75">
              <li><strong>Hrudník:</strong> přes nejplnější místo prsou</li>
              <li><strong>Pas:</strong> v nejsužším místě nad pupíkem</li>
              <li><strong>Boky:</strong> přes nejširší část hýždí</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowSizeGuide(false)}
              className="min-h-touch w-full cursor-pointer rounded-full bg-linda-cognac text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Rozumím
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
