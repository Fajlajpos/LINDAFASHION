'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, Gift, Check } from 'lucide-react';

export default function KosikPage() {
  const [items, setItems] = useState([
    {
      id: 'c1',
      nazev: 'Hedvábné šaty Bellissima',
      slug: 'hedvabne-saty-bellissima',
      velikost: 'M (38)',
      cena: 3490,
      mnozstvi: 1,
    },
    {
      id: 'c2',
      nazev: 'Lněná halenka Firenze',
      slug: 'lnena-halenka-firenze',
      cena: 1890,
      velikost: 'S/M',
      mnozstvi: 1,
    },
  ]);

  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [giftCode, setGiftCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState<number | null>(null);
  const [codeSuccessMessage, setCodeSuccessMessage] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.cena * item.mnozstvi, 0);

  // 1. Sleva z kódu v %
  const discountAmount = appliedDiscount ? Math.round((subtotal * appliedDiscount) / 100) : 0;
  const priceAfterDiscountCode = Math.max(0, subtotal - discountAmount);

  // 2. Opočítání z Dárkového Poukazu
  const giftCardAmount = appliedGiftCard ? Math.min(priceAfterDiscountCode, appliedGiftCard) : 0;
  const finalPrice = Math.max(0, priceAfterDiscountCode - giftCardAmount);

  const freeShippingThreshold = 2500;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const applyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (discountCode.toUpperCase() === 'VITAJTE10') {
      setAppliedDiscount(10);
      setCodeSuccessMessage('Slevový kód VITAJTE10 (10 %) byl uplatněn.');
    } else {
      alert('Neplatný slevový kód. Vyzkoušejte např. VITAJTE10');
    }
  };

  const applyGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (giftCode.toUpperCase().includes('GIFT')) {
      setAppliedGiftCard(1000);
      setCodeSuccessMessage('Dárkový poukaz na 1 000 Kč byl uplatněn.');
    } else {
      alert('Neplatný dárkový poukaz. Vyzkoušejte např. GIFT-LINDA-1000');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-4xl text-[#2B2019]">Nákupní košík</h1>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Cart items list */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free shipping progress bar */}
            <div className="p-4 bg-[#FAF8F4] border border-[#E4D9C8] rounded-2xl space-y-2">
              <div className="flex justify-between text-xs font-medium text-[#2B2019]">
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Nakupte ještě za <strong className="text-[#7A4B32]">{remainingForFreeShipping.toLocaleString('cs-CZ')} Kč</strong> a máte dopravu zdarma!
                  </span>
                ) : (
                  <span className="text-[#6B7255] font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4 text-[#6B7255]" />
                    Máte nárok na DOPRAVU ZDARMA!
                  </span>
                )}
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#E4D9C8]/40 h-2 rounded-full overflow-hidden">
                <div className="bg-[#7A4B32] h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {/* Table of items */}
            <div className="bg-white rounded-2xl border border-[#E4D9C8]/60 divide-y divide-[#E4D9C8]/40 shadow-card">
              {items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Link href={`/produkt/${item.slug}`} className="font-serif text-xl text-[#2B2019] hover:text-[#7A4B32]">
                      {item.nazev}
                    </Link>
                    <div className="text-xs text-[#2B2019]/60">Velikost: {item.velikost}</div>
                    <div className="text-sm font-semibold text-[#7A4B32]">{item.cena.toLocaleString('cs-CZ')} Kč</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-[#E4D9C8] rounded-lg">
                      <button
                        onClick={() =>
                          setItems(
                            items.map((i) => (i.id === item.id ? { ...i, mnozstvi: Math.max(1, i.mnozstvi - 1) } : i))
                          )
                        }
                        className="px-3 py-1 text-sm font-bold text-[#2B2019]"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-semibold">{item.mnozstvi}</span>
                      <button
                        onClick={() =>
                          setItems(items.map((i) => (i.id === item.id ? { ...i, mnozstvi: i.mnozstvi + 1 } : i)))
                        }
                        className="px-3 py-1 text-sm font-bold text-[#2B2019]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo code inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Discount Code */}
              <form onSubmit={applyDiscount} className="p-4 bg-white border border-[#E4D9C8]/60 rounded-2xl space-y-2">
                <label className="text-xs font-semibold text-[#2B2019] flex items-center gap-1.5 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-[#7A4B32]" />
                  Slevový kód
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Např. VITAJTE10"
                    className="flex-1 bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A4B32]"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#2B2019] text-white text-xs font-semibold rounded-xl hover:bg-[#7A4B32]">
                    Použít
                  </button>
                </div>
              </form>

              {/* Gift Card */}
              <form onSubmit={applyGiftCard} className="p-4 bg-white border border-[#E4D9C8]/60 rounded-2xl space-y-2">
                <label className="text-xs font-semibold text-[#2B2019] flex items-center gap-1.5 uppercase tracking-wider">
                  <Gift className="w-3.5 h-3.5 text-[#7A4B32]" />
                  Dárkový poukaz
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="Např. GIFT-LINDA-1000"
                    className="flex-1 bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A4B32]"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#7A4B32] text-white text-xs font-semibold rounded-xl hover:bg-[#633B26]">
                    Použít
                  </button>
                </div>
              </form>
            </div>

            {codeSuccessMessage && (
              <div className="p-3 bg-[#6B7255]/20 border border-[#6B7255] text-[#2B2019] text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-[#6B7255]" />
                {codeSuccessMessage}
              </div>
            )}
          </div>

          {/* Cart summary box */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-6">
              <h3 className="font-serif text-2xl text-[#2B2019] border-b border-[#E4D9C8]/60 pb-3">
                Shrnutí objednávky
              </h3>

              <div className="space-y-3 text-xs text-[#2B2019]/80">
                <div className="flex justify-between">
                  <span>Mezisoučet:</span>
                  <span className="font-medium">{subtotal.toLocaleString('cs-CZ')} Kč</span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-[#7A4B32] font-medium">
                    <span>Sleva ({appliedDiscount} %):</span>
                    <span>-{discountAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}

                {appliedGiftCard && (
                  <div className="flex justify-between text-[#6B7255] font-medium">
                    <span>Dárkový poukaz:</span>
                    <span>-{giftCardAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Doprava:</span>
                  <span>{remainingForFreeShipping === 0 ? 'ZDARMA' : 'Vypočítá se v dalším kroku'}</span>
                </div>

                <div className="pt-4 border-t border-[#E4D9C8] flex justify-between items-baseline text-base font-semibold text-[#2B2019]">
                  <span>Celkem k úhradě:</span>
                  <span className="text-2xl font-serif text-[#7A4B32]">{finalPrice.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>

              <Link
                href="/pokladna"
                className="w-full py-4 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2"
              >
                Pokračovat k pokladně
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E4D9C8] p-8 space-y-4 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-[#7A4B32] mx-auto opacity-40" />
          <h3 className="font-serif text-2xl text-[#2B2019]">Váš košík je prázdný</h3>
          <p className="text-xs text-[#2B2019]/60">Prohlédněte si naši novou kolekci italského oblečení.</p>
          <Link href="/produkty" className="inline-block px-6 py-3 bg-[#7A4B32] text-white text-xs font-semibold rounded-full">
            Prohlédnout kolekce
          </Link>
        </div>
      )}
    </div>
  );
}
