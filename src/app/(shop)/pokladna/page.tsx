'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, CreditCard, QrCode, CheckCircle, MapPin } from 'lucide-react';
import { SHIPPING_METHODS } from '@/lib/shipping';

export default function PokladnaPage() {
  const router = useRouter();
  const [shippingMethod, setShippingMethod] = useState('zasilkovna');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // dočasný můstek
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    email: '',
    telefon: '',
    jmenoPrijmeni: '',
    ulice: '',
    mesto: '',
    psc: '',
    zeme: 'CZ',
    poznamka: '',
    souhlasOP: false, // Povinný souhlas s OP
    souhlasNewsletter: false, // Samostatný dobrovolný souhlas pro GDPR
  });

  const subtotal = 5380;
  const shippingCost = shippingMethod === 'zasilkovna' ? 79 : shippingMethod === 'ppl' ? 109 : 99;
  const isFreeShipping = subtotal >= 2500;
  const finalShippingCost = isFreeShipping ? 0 : shippingCost;
  const total = subtotal + finalShippingCost;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.souhlasOP) {
      alert('Pro dokončení objednávky je nutné souhlasit s Obchodními podmínkami.');
      return;
    }

    const cisloObjednavky = `LF-${Date.now().toString().slice(-6)}`;
    router.push(`/pokladna/potvrzeni?cislo=${cisloObjednavky}&platba=${paymentMethod}&celkem=${total}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-4xl text-[#2B2019]">Pokladna</h1>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Form Fields */}
        <div className="lg:col-span-8 space-y-8">
          {/* Contact Details */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
            <h3 className="font-serif text-2xl text-[#2B2019] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7A4B32] text-white text-xs flex items-center justify-center font-sans font-bold">1</span>
              Kontaktní údaje
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2019] mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vas.email@example.cz"
                  className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2019] mb-1">Telefon *</label>
                <input
                  type="tel"
                  required
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  placeholder="+420 777 888 999"
                  className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
            <h3 className="font-serif text-2xl text-[#2B2019] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7A4B32] text-white text-xs flex items-center justify-center font-sans font-bold">2</span>
              Doručovací adresa
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2019] mb-1">Jméno a příjmení *</label>
                <input
                  type="text"
                  required
                  value={formData.jmenoPrijmeni}
                  onChange={(e) => setFormData({ ...formData, jmenoPrijmeni: e.target.value })}
                  placeholder="Marie Nováková"
                  className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#2B2019] mb-1">Ulice a číslo popisné *</label>
                  <input
                    type="text"
                    required
                    value={formData.ulice}
                    onChange={(e) => setFormData({ ...formData, ulice: e.target.value })}
                    placeholder="Vodičkova 45"
                    className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2019] mb-1">PSČ *</label>
                  <input
                    type="text"
                    required
                    value={formData.psc}
                    onChange={(e) => setFormData({ ...formData, psc: e.target.value })}
                    placeholder="110 00"
                    className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2019] mb-1">Město *</label>
                <input
                  type="text"
                  required
                  value={formData.mesto}
                  onChange={(e) => setFormData({ ...formData, mesto: e.target.value })}
                  placeholder="Praha 1"
                  className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                />
              </div>
            </div>
          </div>

          {/* Shipping Options */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
            <h3 className="font-serif text-2xl text-[#2B2019] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7A4B32] text-white text-xs flex items-center justify-center font-sans font-bold">3</span>
              Způsob dopravy
            </h3>

            <div className="space-y-3">
              {SHIPPING_METHODS.map((sm) => (
                <label
                  key={sm.id}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    shippingMethod === sm.id
                      ? 'border-[#7A4B32] bg-[#FAF8F4]'
                      : 'border-[#E4D9C8]/60 bg-white hover:border-[#7A4B32]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={sm.id}
                      checked={shippingMethod === sm.id}
                      onChange={() => setShippingMethod(sm.id)}
                      className="accent-[#7A4B32]"
                    />
                    <div>
                      <h4 className="font-semibold text-xs text-[#2B2019]">{sm.nazev}</h4>
                      <p className="text-[11px] text-[#2B2019]/60">{sm.popis}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#7A4B32]">
                    {isFreeShipping ? 'ZDARMA' : `${sm.cena} Kč`}
                  </span>
                </label>
              ))}
            </div>

            {/* Packeta pickup point widget selection preview */}
            {shippingMethod === 'zasilkovna' && (
              <div className="p-4 bg-[#FAF8F4] rounded-xl border border-[#E4D9C8] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2B2019] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#7A4B32]" />
                    Vybrané výdejní místo:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPickupPoint('Z-BOX Vodičkova 45, Praha 1')}
                    className="text-[#7A4B32] underline font-medium"
                  >
                    {selectedPickupPoint ? 'Změnit výdejní místo' : 'Vybrat na mapě'}
                  </button>
                </div>
                {selectedPickupPoint ? (
                  <div className="p-2.5 bg-white rounded-lg border border-[#E4D9C8] font-medium text-[#7A4B32]">
                    📍 {selectedPickupPoint}
                  </div>
                ) : (
                  <p className="text-[#2B2019]/60">Pro dokončení prosím klikněte na tlačítko Vybrat na mapě.</p>
                )}
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
            <h3 className="font-serif text-2xl text-[#2B2019] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7A4B32] text-white text-xs flex items-center justify-center font-sans font-bold">4</span>
              Způsob platby
            </h3>

            <div className="space-y-3">
              {/* GoPay Platba kartou */}
              <label
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'gopay'
                    ? 'border-[#7A4B32] bg-[#FAF8F4]'
                    : 'border-[#E4D9C8]/60 bg-white hover:border-[#7A4B32]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="gopay"
                    checked={paymentMethod === 'gopay'}
                    onChange={() => setPaymentMethod('gopay')}
                    className="accent-[#7A4B32]"
                  />
                  <div>
                    <h4 className="font-semibold text-xs text-[#2B2019] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#7A4B32]" />
                      Platba kartou online (GoPay)
                    </h4>
                    <p className="text-[11px] text-[#2B2019]/60">Okamžitá platba přes zabezpečenou bránu GoPay.</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#6B7255]">ZDARMA</span>
              </label>

              {/* Bankovní Převod (Dočasný můstek) */}
              <label
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-[#7A4B32] bg-[#FAF8F4]'
                    : 'border-[#E4D9C8]/60 bg-white hover:border-[#7A4B32]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="accent-[#7A4B32]"
                  />
                  <div>
                    <h4 className="font-semibold text-xs text-[#2B2019] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#7A4B32]" />
                      Bankovní převod + QR Platba (Dočasná metoda)
                    </h4>
                    <p className="text-[11px] text-[#2B2019]/60">
                      Zobrazení platebních údajů s QR kódem po odeslání.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#6B7255]">ZDARMA</span>
              </label>
            </div>
          </div>

          {/* Legal Consents (GDPR Compliance) */}
          <div className="p-6 bg-[#FAF8F4] rounded-2xl border border-[#E4D9C8] space-y-4 text-xs">
            {/* Mandatory T&C Agreement */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.souhlasOP}
                onChange={(e) => setFormData({ ...formData, souhlasOP: e.target.checked })}
                className="w-4 h-4 accent-[#7A4B32] mt-0.5"
              />
              <span className="text-[#2B2019]/90">
                Souhlasím s{' '}
                <Link href="/obchodni-podminky" target="_blank" className="underline text-[#7A4B32] font-semibold">
                  Obchodními podmínkami
                </Link>{' '}
                a beru na vědomí storno i reklamační řád. *
              </span>
            </label>

            {/* Separate Voluntary Newsletter Consent */}
            <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-[#E4D9C8]/40">
              <input
                type="checkbox"
                checked={formData.souhlasNewsletter}
                onChange={(e) => setFormData({ ...formData, souhlasNewsletter: e.target.checked })}
                className="w-4 h-4 accent-[#7A4B32] mt-0.5"
              />
              <span className="text-[#2B2019]/80">
                Chci odebírat novinky z italských kolekcí na e-mail (dobrovolný marketingový souhlas dle GDPR).
              </span>
            </label>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-6 sticky top-24">
            <h3 className="font-serif text-2xl text-[#2B2019] border-b border-[#E4D9C8]/60 pb-3">
              Vaše objednávka
            </h3>

            <div className="space-y-3 text-xs text-[#2B2019]/80">
              <div className="flex justify-between">
                <span>Položky (2x):</span>
                <span className="font-medium">{subtotal.toLocaleString('cs-CZ')} Kč</span>
              </div>
              <div className="flex justify-between">
                <span>Doprava:</span>
                <span className="font-medium text-[#7A4B32]">
                  {finalShippingCost === 0 ? 'ZDARMA' : `${finalShippingCost} Kč`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platba:</span>
                <span className="font-medium text-[#6B7255]">0 Kč</span>
              </div>

              <div className="pt-4 border-t border-[#E4D9C8] flex justify-between items-baseline text-base font-semibold text-[#2B2019]">
                <span>Celková cena:</span>
                <span className="text-2xl font-serif text-[#7A4B32]">{total.toLocaleString('cs-CZ')} Kč</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Závazně objednat s povinností platby
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
