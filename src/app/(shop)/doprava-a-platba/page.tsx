import React from 'react';
import { Truck, CreditCard, ShieldCheck } from 'lucide-react';
import { SHIPPING_METHODS } from '@/lib/shipping';

export default function DopravaAPlatbaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-[#2B2019]">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-4xl">Možnosti dopravy a platby</h1>
        <p className="text-xs text-[#2B2019]/60 mt-1">Přehled způsobů doručení a plateb v e-shopu LINDA FASHION</p>
      </div>

      {/* Shipping Overview */}
      <div className="space-y-6">
        <h3 className="font-serif text-2xl text-[#7A4B32] flex items-center gap-2">
          <Truck className="w-6 h-6" />
          Způsoby doručení
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHIPPING_METHODS.map((sm) => (
            <div key={sm.id} className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-2">
              <h4 className="font-serif text-lg text-[#2B2019]">{sm.nazev}</h4>
              <p className="text-xs text-[#2B2019]/70">{sm.popis}</p>
              <div className="pt-2 font-semibold text-sm text-[#7A4B32]">{sm.cena} Kč</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#FAF8F4] border border-[#E4D9C8] rounded-2xl text-xs text-[#2B2019]/80 font-medium">
          💡 <strong>Doprava zdarma:</strong> Při nákupu nad <strong>2 500 Kč</strong> hradíme kompletní poštovné za vás!
        </div>
      </div>

      {/* Payment Overview */}
      <div className="space-y-6 pt-6 border-t border-[#E4D9C8]/60">
        <h3 className="font-serif text-2xl text-[#7A4B32] flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Platební metody
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-2">
            <h4 className="font-serif text-lg text-[#2B2019]">Platba kartou online (GoPay)</h4>
            <p className="text-xs text-[#2B2019]/70">Zabezpečená platba kartou Visa, Mastercard nebo Apple Pay/Google Pay bez poplatku.</p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-2">
            <h4 className="font-serif text-lg text-[#2B2019]">Bankovní převod + QR Platba</h4>
            <p className="text-xs text-[#2B2019]/70">Bezhotovostní převod na náš účet s přehledným QR kódem po dokončení objednávky.</p>
          </div>
        </div>

        <div className="p-4 bg-[#2B2019] text-[#FAF8F4] rounded-2xl text-xs space-y-1">
          <span className="font-semibold text-[#E4D9C8]">Upozornění k platbám:</span>
          <p className="text-[#FAF8F4]/80">E-shop LINDA FASHION nepodporuje platbu na dobírku pro zajištění maximální bezpečnosti a plynulosti doručení.</p>
        </div>
      </div>
    </div>
  );
}
