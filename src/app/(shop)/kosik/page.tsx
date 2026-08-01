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

  // Chyby kódů drží stav po jednotlivých polích. Dřív je hlásil `alert()` –
  // systémové okno vytrhne z kontextu a nezůstane u pole, kterého se týká.
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);

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
      setDiscountError(null);
      setCodeSuccessMessage('Slevový kód VITAJTE10 (10 %) byl uplatněn.');
    } else {
      setDiscountError('Neplatný slevový kód. Vyzkoušejte např. VITAJTE10.');
    }
  };

  const applyGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (giftCode.toUpperCase().includes('GIFT')) {
      setAppliedGiftCard(1000);
      setGiftError(null);
      setCodeSuccessMessage('Dárkový poukaz na 1 000 Kč byl uplatněn.');
    } else {
      setGiftError('Neplatný dárkový poukaz. Vyzkoušejte např. GIFT-LINDA-1000.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Nákupní košík</h1>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Cart items list */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free shipping progress bar */}
            <div className="space-y-2 rounded-2xl bg-linda-cream p-4 shadow-neu">
              <div className="flex justify-between gap-3 text-xs font-medium text-linda-espresso">
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Nakupte ještě za <strong className="text-linda-cognac">{remainingForFreeShipping.toLocaleString('cs-CZ')} Kč</strong> a máte dopravu zdarma!
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-linda-sage">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Máte nárok na DOPRAVU ZDARMA!
                  </span>
                )}
                <span className="shrink-0 tabular-nums">{progressPercent}%</span>
              </div>

              {/* Ukazatel je vyfrézovaný žlábek, výplň v něm leží – stejný
                  jazyk jako vstupní pole. */}
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Postup k dopravě zdarma"
                className="h-2.5 w-full overflow-hidden rounded-full bg-linda-sandLight shadow-neuInsetSm"
              >
                <div
                  className="h-full rounded-full bg-linda-cognac transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Table of items */}
            <div className="divide-y divide-linda-sand/40 rounded-2xl bg-linda-cream shadow-neu">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <Link
                      href={`/produkt/${item.slug}`}
                      className="font-serif text-xl text-linda-espresso transition-colors hover:text-linda-cognac"
                    >
                      {item.nazev}
                    </Link>
                    <div className="text-xs text-linda-espresso/70">Velikost: {item.velikost}</div>
                    <div className="text-sm font-semibold text-linda-cognac">{item.cena.toLocaleString('cs-CZ')} Kč</div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Počítadlo je žlábek, tlačítka v něm vystupují.
                        Původně měla přes `py-1` jen ~26 px – teď 44×44. */}
                    <div className="flex items-center gap-1 rounded-xl bg-linda-sandLight p-1 shadow-neuInsetSm">
                      <button
                        type="button"
                        onClick={() =>
                          setItems(
                            items.map((i) => (i.id === item.id ? { ...i, mnozstvi: Math.max(1, i.mnozstvi - 1) } : i))
                          )
                        }
                        aria-label={`Ubrat kus – ${item.nazev}`}
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-linda-cream text-sm font-bold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                      >
                        &minus;
                      </button>
                      <span aria-live="polite" className="w-8 text-center text-xs font-semibold tabular-nums text-linda-espresso">
                        {item.mnozstvi}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setItems(items.map((i) => (i.id === item.id ? { ...i, mnozstvi: i.mnozstvi + 1 } : i)))
                        }
                        aria-label={`Přidat kus – ${item.nazev}`}
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-linda-cream text-sm font-bold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                      >
                        +
                      </button>
                    </div>

                    {/* `text-gray-400` na bílé dávalo 2,8:1 – espresso/70 je 6:1. */}
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                      aria-label={`Odebrat z košíku – ${item.nazev}`}
                      className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo code inputs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Discount Code */}
              <form onSubmit={applyDiscount} className="space-y-2 rounded-2xl bg-linda-cream p-4 shadow-neu">
                <label
                  htmlFor="slevovy-kod"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-linda-espresso"
                >
                  <Tag className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Slevový kód
                </label>
                <div className="flex gap-2">
                  <input
                    id="slevovy-kod"
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Např. VITAJTE10"
                    aria-invalid={Boolean(discountError)}
                    aria-describedby={discountError ? 'slevovy-kod-chyba' : undefined}
                    className="min-h-touch flex-1 rounded-xl bg-linda-sandLight px-3 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
                  />
                  <button
                    type="submit"
                    className="min-h-touch shrink-0 cursor-pointer rounded-xl bg-linda-espresso px-4 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
                  >
                    Použít
                  </button>
                </div>
                {discountError && (
                  <p id="slevovy-kod-chyba" role="alert" className="text-xs font-medium text-linda-cognac">
                    {discountError}
                  </p>
                )}
              </form>

              {/* Gift Card */}
              <form onSubmit={applyGiftCard} className="space-y-2 rounded-2xl bg-linda-cream p-4 shadow-neu">
                <label
                  htmlFor="darkovy-poukaz"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-linda-espresso"
                >
                  <Gift className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
                  Dárkový poukaz
                </label>
                <div className="flex gap-2">
                  <input
                    id="darkovy-poukaz"
                    type="text"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="Např. GIFT-LINDA-1000"
                    aria-invalid={Boolean(giftError)}
                    aria-describedby={giftError ? 'darkovy-poukaz-chyba' : undefined}
                    className="min-h-touch flex-1 rounded-xl bg-linda-sandLight px-3 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
                  />
                  <button
                    type="submit"
                    className="min-h-touch shrink-0 cursor-pointer rounded-xl bg-linda-cognac px-4 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
                  >
                    Použít
                  </button>
                </div>
                {giftError && (
                  <p id="darkovy-poukaz-chyba" role="alert" className="text-xs font-medium text-linda-cognac">
                    {giftError}
                  </p>
                )}
              </form>
            </div>

            {codeSuccessMessage && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl bg-linda-sageLight p-3 text-xs text-linda-espresso shadow-neuInsetSm"
              >
                <Check className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
                {codeSuccessMessage}
              </div>
            )}
          </div>

          {/* Cart summary box */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neuLg">
              <h2 className="border-b border-linda-sand/60 pb-3 font-serif text-2xl text-linda-espresso">
                Shrnutí objednávky
              </h2>

              <div className="space-y-3 text-xs text-linda-espresso/80">
                <div className="flex justify-between">
                  <span>Mezisoučet:</span>
                  <span className="font-medium">{subtotal.toLocaleString('cs-CZ')} Kč</span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between font-medium text-linda-cognac">
                    <span>Sleva ({appliedDiscount} %):</span>
                    <span>-{discountAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}

                {appliedGiftCard && (
                  <div className="flex justify-between font-medium text-linda-sage">
                    <span>Dárkový poukaz:</span>
                    <span>-{giftCardAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Doprava:</span>
                  <span>{remainingForFreeShipping === 0 ? 'ZDARMA' : 'Vypočítá se v dalším kroku'}</span>
                </div>

                {/* Součet sedí v prohlubni – nejdůležitější číslo stránky má
                    vlastní plochu, ne jen tučnější řez. */}
                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-linda-sandLight px-4 py-3 text-base font-semibold text-linda-espresso shadow-neuInsetSm">
                  <span>Celkem k úhradě:</span>
                  <span className="font-serif text-2xl text-linda-cognac">{finalPrice.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>

              <Link
                href="/pokladna"
                className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                Pokračovat k pokladně
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-linda-cream p-8 py-16 text-center shadow-neu">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linda-sandLight shadow-neuInset">
            <ShoppingBag className="h-9 w-9 text-linda-cognac" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-2xl text-linda-espresso">Váš košík je prázdný</h2>
          <p className="text-xs text-linda-espresso/70">Prohlédněte si naši novou kolekci italského oblečení.</p>
          <Link
            href="/produkty"
            className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Prohlédnout kolekce
          </Link>
        </div>
      )}
    </div>
  );
}
