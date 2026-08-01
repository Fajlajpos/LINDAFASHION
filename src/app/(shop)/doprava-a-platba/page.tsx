import React from 'react';
import { Truck, CreditCard, ShieldCheck } from 'lucide-react';
import { SHIPPING_METHODS } from '@/lib/shipping';

export default function DopravaAPlatbaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 text-linda-espresso sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl">Možnosti dopravy a platby</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">Přehled způsobů doručení a plateb v e-shopu LINDA FASHION</p>
      </div>

      {/* Shipping Overview */}
      <div className="space-y-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-cognac">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </span>
          Způsoby doručení
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SHIPPING_METHODS.map((sm) => (
            <div key={sm.id} className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
              <h3 className="font-serif text-lg text-linda-espresso">{sm.nazev}</h3>
              <p className="text-xs text-linda-espresso/75">{sm.popis}</p>
              <div className="pt-2 text-sm font-semibold text-linda-cognac">{sm.cena} Kč</div>
            </div>
          ))}
        </div>

        {/* Emoji 💡 nahradila ikona – emoji se napříč systémy vykresluje
            jinak a odečítač ho čte jako „žárovka“. */}
        <p className="flex items-start gap-2 rounded-2xl bg-linda-sandLight p-4 text-xs font-medium text-linda-espresso/80 shadow-neuInsetSm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
          <span>
            <strong>Doprava zdarma:</strong> Při nákupu nad <strong>2 500 Kč</strong> hradíme kompletní poštovné za vás!
          </span>
        </p>
      </div>

      {/* Payment Overview */}
      <div className="space-y-6 border-t border-linda-sand/60 pt-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-cognac">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linda-cream shadow-neuSm">
            <CreditCard className="h-6 w-6" aria-hidden="true" />
          </span>
          Platební metody
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <h3 className="font-serif text-lg text-linda-espresso">Platba kartou online (GoPay)</h3>
            <p className="text-xs text-linda-espresso/75">Zabezpečená platba kartou Visa, Mastercard nebo Apple Pay/Google Pay bez poplatku.</p>
          </div>

          <div className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <h3 className="font-serif text-lg text-linda-espresso">Bankovní převod + QR Platba</h3>
            <p className="text-xs text-linda-espresso/75">Bezhotovostní převod na náš účet s přehledným QR kódem po dokončení objednávky.</p>
          </div>
        </div>

        <div className="space-y-1 rounded-2xl bg-linda-espresso p-4 text-xs text-linda-cream shadow-neu">
          <span className="font-semibold text-linda-sand">Upozornění k platbám:</span>
          <p className="text-linda-cream/80">E-shop LINDA FASHION nepodporuje platbu na dobírku pro zajištění maximální bezpečnosti a plynulosti doručení.</p>
        </div>
      </div>
    </div>
  );
}
