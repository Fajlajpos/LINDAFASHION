'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, User, MapPin, Heart, AlertTriangle, Truck, Ban, CheckCircle, Clock } from 'lucide-react';

export default function MujUcetPage() {
  const [activeTab, setActiveTab] = useState<'objednavky' | 'adresy' | 'profil'>('objednavky');

  // Potvrzení anonymizace hlásil `alert()`. Systémové okno vytrhne z kontextu
  // a po zavření po sobě nenechá stopu – potvrzení proto zůstává na stránce.
  const [anonymizaceHotova, setAnonymizaceHotova] = useState(false);

  // Sample order history
  const [orders, setOrders] = useState([
    {
      id: 'o1',
      cisloObjednavky: 'LF-2026001',
      datum: '29. 07. 2026',
      stav: 'NOVA', // Nová -> zákaznice MŮŽE sama stornovat
      celkovaCena: 5380,
      polozky: 'Hedvábné šaty Bellissima (M), Lněná halenka Firenze (S/M)',
      cisloZasilky: null,
    },
    {
      id: 'o2',
      cisloObjednavky: 'LF-2026002',
      datum: '15. 06. 2026',
      stav: 'DORUCENA', // Doručeno
      celkovaCena: 2390,
      polozky: 'Kašmírový svetr Roma (Univerzální)',
      cisloZasilky: 'ZAS-88741299',
    },
  ]);

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Opravdu si přejete zrušit tuto objednávku?')) {
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, stav: 'ZRUSENA', zrusil: 'ZAKAZNICE' } : o))
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col justify-between gap-4 border-b border-linda-sand pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-widest text-linda-cognac">
            Můj zákaznický profil
          </span>
          <h1 className="font-serif text-4xl text-linda-espresso">Vítejte, Marie Nováková</h1>
        </div>

        <Link
          href="/api/auth/signout"
          className="inline-flex min-h-touch shrink-0 cursor-pointer items-center rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Odhlásit se
        </Link>
      </div>

      {/* Tabs navigation – segmentované ovládání ve žlábku: aktivní panel
          je zamáčknutý dovnitř, ostatní leží v rovině. */}
      <div
        role="tablist"
        aria-label="Sekce zákaznického účtu"
        className="flex flex-wrap gap-2 rounded-2xl bg-linda-sandLight p-2 text-sm font-medium shadow-neuInsetSm"
      >
        {([
          { id: 'objednavky', Ikona: Package, label: `Moje objednávky (${orders.length})` },
          { id: 'adresy', Ikona: MapPin, label: 'Uložené adresy' },
          { id: 'profil', Ikona: User, label: 'Osobní údaje & GDPR' },
        ] as const).map(({ id, Ikona, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-xs transition-all duration-200 sm:text-sm ${
              activeTab === id
                ? 'bg-linda-cream font-semibold text-linda-cognac shadow-neu'
                : 'text-linda-espresso/75 hover:text-linda-espresso hover:shadow-neuSm'
            }`}
          >
            <Ikona className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'objednavky' && (
        <div className="space-y-6">
          {orders.map((o) => (
            <div key={o.id} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
              <div className="flex flex-col justify-between gap-2 border-b border-linda-sand/40 pb-4 sm:flex-row sm:items-center">
                <div>
                  <span className="font-serif text-xl font-medium text-linda-espresso">
                    Objednávka #{o.cisloObjednavky}
                  </span>
                  <span className="block text-xs text-linda-espresso/70">Vytvořeno: {o.datum}</span>
                </div>

                {/* Stavové odznaky jsou prohlubně – leží v kartě jako štítek
                    vyražený do materiálu. Ikona doprovází barvu, takže stav
                    nezávisí jen na odstínu. */}
                <div className="flex flex-wrap items-center gap-3">
                  {o.stav === 'NOVA' && (
                    <span className="flex items-center gap-1 rounded-full bg-linda-sandLight px-3 py-1 text-xs font-semibold text-linda-espresso shadow-neuInsetSm">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Nová (Zpracovává se)
                    </span>
                  )}
                  {o.stav === 'DORUCENA' && (
                    <span className="flex items-center gap-1 rounded-full bg-linda-sageLight px-3 py-1 text-xs font-semibold text-linda-sage shadow-neuInsetSm">
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Doručeno
                    </span>
                  )}
                  {o.stav === 'ZRUSENA' && (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-neuInsetSm">
                      <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                      Zrušeno
                    </span>
                  )}

                  <span className="font-serif text-lg font-semibold text-linda-cognac">
                    {o.celkovaCena.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-linda-espresso/80">
                <p><strong>Položky:</strong> {o.polozky}</p>
                {o.cisloZasilky && (
                  <p className="flex items-center gap-1.5 pt-1 font-medium text-linda-sage">
                    <Truck className="h-4 w-4" aria-hidden="true" />
                    Sledování Zásilkovny: <u>{o.cisloZasilky}</u>
                  </p>
                )}
              </div>

              {/* Customer Cancel Button for NEW status ONLY.
                  Storno zůstává v červené – je to jediná nevratná akce na
                  stránce a značková koňaková by ji schovala mezi běžná CTA. */}
              {o.stav === 'NOVA' && (
                <div className="flex justify-end border-t border-linda-sand/40 pt-3">
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(o.id)}
                    className="min-h-touch cursor-pointer rounded-full bg-linda-cream px-4 text-xs font-semibold text-red-700 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                  >
                    Stornovat objednávku
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'adresy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <span className="text-xs font-semibold uppercase tracking-widest text-linda-cognac">
              Výchozí doručovací adresa
            </span>
            <h2 className="font-serif text-lg text-linda-espresso">Marie Nováková</h2>
            <p className="text-xs leading-relaxed text-linda-espresso/75">
              Vodičkova 45<br />
              110 00 Praha 1<br />
              Česká republika<br />
              Tel: +420 608 112 233
            </p>
          </div>
        </div>
      )}

      {/* Profile & GDPR Tab */}
      {activeTab === 'profil' && (
        <div className="max-w-xl space-y-6 rounded-2xl bg-linda-cream p-8 shadow-neu">
          <h2 className="font-serif text-2xl text-linda-espresso">Osobní údaje &amp; GDPR Práva</h2>

          <div className="space-y-3 text-xs text-linda-espresso/80">
            <p><strong>Jméno:</strong> Marie Nováková</p>
            <p><strong>E-mail:</strong> zakaznice@example.cz</p>
            <p><strong>Souhlas s newsletterem:</strong> Aktivní</p>
          </div>

          <div className="space-y-2 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
            <h3 className="flex items-center gap-1.5 font-semibold text-linda-espresso">
              <AlertTriangle className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
              Smazání účtu a právo na výmaz (GDPR)
            </h3>
            <p className="leading-relaxed text-linda-espresso/75">
              Při smazání účtu anonymizujeme vaše osobní údaje. Zákonná účetní archivační povinnost nám ukládá uchovat daňové doklady objednávek po dobu stanovenou zákonem bez vazby na váš osobní profil.
            </p>
            {anonymizaceHotova ? (
              <p role="status" className="mt-2 font-semibold text-linda-sage">
                Požadavek na anonymizaci údajů byl zaznamenán. Ozveme se e-mailem.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setAnonymizaceHotova(true)}
                className="mt-2 min-h-touch cursor-pointer rounded-full bg-red-700 px-4 font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-red-800 active:shadow-neuSm"
              >
                Anonymizovat a smazat můj účet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
