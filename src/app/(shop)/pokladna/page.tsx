'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, QrCode, CheckCircle, MapPin } from 'lucide-react';
import { SHIPPING_METHODS } from '@/lib/shipping';

/**
 * Krok pokladny – vystouplá krémová karta s číslem kroku v terči.
 *
 * Čtyři sekce měly původně stejných devět tříd opsaných ručně; drobná
 * odchylka mezi nimi by se v revizi ztratila.
 */
const KrokKarty: React.FC<{ cislo: number; nadpis: string; children: React.ReactNode }> = ({
  cislo,
  nadpis,
  children,
}) => (
  <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
    <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-linda-cognac font-sans text-xs font-bold text-white shadow-neuOnDark"
      >
        {cislo}
      </span>
      {nadpis}
    </h2>
    {children}
  </section>
);

/**
 * Textové pole pokladny.
 *
 * Popisek je svázaný s polem přes `htmlFor`/`id` – dřív stál `<label>` vedle
 * inputu bez vazby, takže ho odečítač obrazovky nepřečetl a kliknutí na text
 * pole nezaostřilo.
 */
const Pole: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}> = ({ id, label, value, onChange, type = 'text', placeholder, autoComplete, required }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-semibold text-linda-espresso">
      {label}
      {required && ' *'}
    </label>
    <input
      id={id}
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      /* Prohlubeň místo rámečku – tvar sám říká „sem se píše“. */
      className="min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
    />
  </div>
);

/**
 * Volba dopravy nebo platby.
 *
 * Zvolená možnost je zamáčknutá do plochy, nezvolená leží v rovině a při
 * hoveru se nadzvedne. Stav tak nese tvar, ne pouze barva okraje.
 */
const Volba: React.FC<{
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  nadpis: React.ReactNode;
  popis: string;
  cena: React.ReactNode;
}> = ({ name, value, checked, onSelect, nadpis, popis, cena }) => (
  <label
    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl p-4 transition-all duration-200 ${
      checked
        ? 'bg-linda-sandLight shadow-neuInsetSm'
        : 'bg-linda-cream shadow-neuSm hover:shadow-neu'
    }`}
  >
    <div className="flex items-center gap-3">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
      />
      <div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-linda-espresso">{nadpis}</span>
        <p className="text-[11px] text-linda-espresso/70">{popis}</p>
      </div>
    </div>
    <span className="shrink-0 text-xs font-semibold">{cena}</span>
  </label>
);

export default function PokladnaPage() {
  const router = useRouter();
  const [shippingMethod, setShippingMethod] = useState('zasilkovna');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // dočasný můstek
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<string | null>(null);

  // Chybu souhlasu držíme ve stavu a vypisujeme ji u zaškrtávátka, kterého se
  // týká. Dřív ji hlásil `alert()` – systémové okno vytrhne z kontextu
  // a u pole nezůstane.
  const [souhlasError, setSouhlasError] = useState<string | null>(null);

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
      setSouhlasError('Pro dokončení objednávky je nutné souhlasit s Obchodními podmínkami.');
      return;
    }
    setSouhlasError(null);

    const cisloObjednavky = `LF-${Date.now().toString().slice(-6)}`;
    router.push(`/pokladna/potvrzeni?cislo=${cisloObjednavky}&platba=${paymentMethod}&celkem=${total}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Pokladna</h1>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Main Form Fields */}
        <div className="space-y-8 lg:col-span-8">
          <KrokKarty cislo={1} nadpis="Kontaktní údaje">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Pole
                id="pokladna-email"
                label="E-mail"
                type="email"
                required
                autoComplete="email"
                placeholder="vas.email@example.cz"
                value={formData.email}
                onChange={(v) => setFormData({ ...formData, email: v })}
              />
              <Pole
                id="pokladna-telefon"
                label="Telefon"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+420 777 888 999"
                value={formData.telefon}
                onChange={(v) => setFormData({ ...formData, telefon: v })}
              />
            </div>
          </KrokKarty>

          <KrokKarty cislo={2} nadpis="Doručovací adresa">
            <div className="space-y-4">
              <Pole
                id="pokladna-jmeno"
                label="Jméno a příjmení"
                required
                autoComplete="name"
                placeholder="Marie Nováková"
                value={formData.jmenoPrijmeni}
                onChange={(v) => setFormData({ ...formData, jmenoPrijmeni: v })}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Pole
                    id="pokladna-ulice"
                    label="Ulice a číslo popisné"
                    required
                    autoComplete="street-address"
                    placeholder="Vodičkova 45"
                    value={formData.ulice}
                    onChange={(v) => setFormData({ ...formData, ulice: v })}
                  />
                </div>
                <Pole
                  id="pokladna-psc"
                  label="PSČ"
                  required
                  autoComplete="postal-code"
                  placeholder="110 00"
                  value={formData.psc}
                  onChange={(v) => setFormData({ ...formData, psc: v })}
                />
              </div>

              <Pole
                id="pokladna-mesto"
                label="Město"
                required
                autoComplete="address-level2"
                placeholder="Praha 1"
                value={formData.mesto}
                onChange={(v) => setFormData({ ...formData, mesto: v })}
              />
            </div>
          </KrokKarty>

          <KrokKarty cislo={3} nadpis="Způsob dopravy">
            <div className="space-y-3">
              {SHIPPING_METHODS.map((sm) => (
                <Volba
                  key={sm.id}
                  name="shipping"
                  value={sm.id}
                  checked={shippingMethod === sm.id}
                  onSelect={() => setShippingMethod(sm.id)}
                  nadpis={sm.nazev}
                  popis={sm.popis}
                  cena={
                    isFreeShipping ? (
                      <span className="text-linda-sage">ZDARMA</span>
                    ) : (
                      <span className="text-linda-cognac">{sm.cena} Kč</span>
                    )
                  }
                />
              ))}
            </div>

            {/* Packeta pickup point widget selection preview */}
            {shippingMethod === 'zasilkovna' && (
              <div className="space-y-2 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-linda-espresso">
                    <MapPin className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
                    Vybrané výdejní místo:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPickupPoint('Z-BOX Vodičkova 45, Praha 1')}
                    className="flex min-h-touch cursor-pointer items-center px-1 font-medium text-linda-cognac underline transition-colors hover:text-linda-cognacHover"
                  >
                    {selectedPickupPoint ? 'Změnit výdejní místo' : 'Vybrat na mapě'}
                  </button>
                </div>
                {selectedPickupPoint ? (
                  /* Emoji 📍 nahradila ikona – emoji se napříč systémy
                     vykresluje jinak a odečítač ho čte jako „špendlík“. */
                  <p className="flex items-center gap-2 rounded-lg bg-linda-cream p-2.5 font-medium text-linda-cognac shadow-neuSm">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {selectedPickupPoint}
                  </p>
                ) : (
                  <p className="text-linda-espresso/70">Pro dokončení prosím klikněte na tlačítko Vybrat na mapě.</p>
                )}
              </div>
            )}
          </KrokKarty>

          <KrokKarty cislo={4} nadpis="Způsob platby">
            <div className="space-y-3">
              <Volba
                name="payment"
                value="gopay"
                checked={paymentMethod === 'gopay'}
                onSelect={() => setPaymentMethod('gopay')}
                nadpis={
                  <>
                    <CreditCard className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
                    Platba kartou online (GoPay)
                  </>
                }
                popis="Okamžitá platba přes zabezpečenou bránu GoPay."
                cena={<span className="text-linda-sage">ZDARMA</span>}
              />

              <Volba
                name="payment"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onSelect={() => setPaymentMethod('bank_transfer')}
                nadpis={
                  <>
                    <QrCode className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
                    Bankovní převod + QR Platba (Dočasná metoda)
                  </>
                }
                popis="Zobrazení platebních údajů s QR kódem po odeslání."
                cena={<span className="text-linda-sage">ZDARMA</span>}
              />
            </div>
          </KrokKarty>

          {/* Legal Consents (GDPR Compliance) */}
          <div className="space-y-4 rounded-2xl bg-linda-sandLight p-6 text-xs shadow-neuInset">
            {/* Mandatory T&C Agreement */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                required
                checked={formData.souhlasOP}
                onChange={(e) => {
                  setFormData({ ...formData, souhlasOP: e.target.checked });
                  if (e.target.checked) setSouhlasError(null);
                }}
                aria-invalid={Boolean(souhlasError)}
                aria-describedby={souhlasError ? 'souhlas-op-chyba' : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/90">
                Souhlasím s{' '}
                <Link href="/obchodni-podminky" target="_blank" className="font-semibold text-linda-cognac underline">
                  Obchodními podmínkami
                </Link>{' '}
                a beru na vědomí storno i reklamační řád. *
              </span>
            </label>

            {souhlasError && (
              <p
                id="souhlas-op-chyba"
                role="alert"
                className="flex items-center gap-1.5 font-medium text-linda-cognac"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {souhlasError}
              </p>
            )}

            {/* Separate Voluntary Newsletter Consent */}
            <label className="flex cursor-pointer items-start gap-3 border-t border-linda-sand/60 pt-3">
              <input
                type="checkbox"
                checked={formData.souhlasNewsletter}
                onChange={(e) => setFormData({ ...formData, souhlasNewsletter: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/80">
                Chci odebírat novinky z italských kolekcí na e-mail (dobrovolný marketingový souhlas dle GDPR).
              </span>
            </label>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-24 space-y-6 rounded-2xl bg-linda-cream p-6 shadow-neuLg">
            <h2 className="border-b border-linda-sand/60 pb-3 font-serif text-2xl text-linda-espresso">
              Vaše objednávka
            </h2>

            <div className="space-y-3 text-xs text-linda-espresso/80">
              <div className="flex justify-between">
                <span>Položky (2x):</span>
                <span className="font-medium">{subtotal.toLocaleString('cs-CZ')} Kč</span>
              </div>
              <div className="flex justify-between">
                <span>Doprava:</span>
                <span className="font-medium text-linda-cognac">
                  {finalShippingCost === 0 ? 'ZDARMA' : `${finalShippingCost} Kč`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platba:</span>
                <span className="font-medium text-linda-sage">0 Kč</span>
              </div>

              <div className="mt-4 flex items-baseline justify-between rounded-xl bg-linda-sandLight px-4 py-3 text-base font-semibold text-linda-espresso shadow-neuInsetSm">
                <span>Celková cena:</span>
                <span className="font-serif text-2xl text-linda-cognac">{total.toLocaleString('cs-CZ')} Kč</span>
              </div>
            </div>

            <button
              type="submit"
              className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-4 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Závazně objednat s povinností platby
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
