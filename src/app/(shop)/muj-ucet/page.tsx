'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, User, MapPin, Heart, AlertTriangle, Truck, Ban, CheckCircle, Clock } from 'lucide-react';

export default function MujUcetPage() {
  const [activeTab, setActiveTab] = useState<'objednavky' | 'adresy' | 'profil'>('objednavky');

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
      <div className="border-b border-[#E4D9C8] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold block">
            Můj zákaznický profil
          </span>
          <h1 className="font-serif text-4xl text-[#2B2019]">Vítejte, Marie Nováková</h1>
        </div>

        <Link href="/api/auth/signout" className="text-xs text-[#7A4B32] hover:underline font-semibold">
          Odhlásit se
        </Link>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[#E4D9C8]/60 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('objednavky')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'objednavky'
              ? 'border-[#7A4B32] text-[#7A4B32]'
              : 'border-transparent text-[#2B2019]/60 hover:text-[#2B2019]'
          }`}
        >
          <Package className="w-4 h-4" />
          Moje objednávky ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('adresy')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'adresy'
              ? 'border-[#7A4B32] text-[#7A4B32]'
              : 'border-transparent text-[#2B2019]/60 hover:text-[#2B2019]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Uložené adresy
        </button>

        <button
          onClick={() => setActiveTab('profil')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'profil'
              ? 'border-[#7A4B32] text-[#7A4B32]'
              : 'border-transparent text-[#2B2019]/60 hover:text-[#2B2019]'
          }`}
        >
          <User className="w-4 h-4" />
          Osobní údaje &amp; GDPR
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'objednavky' && (
        <div className="space-y-6">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-[#E4D9C8]/80 p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4D9C8]/40 pb-4">
                <div>
                  <span className="font-serif text-xl text-[#2B2019] font-medium">
                    Objednávka #{o.cisloObjednavky}
                  </span>
                  <span className="text-xs text-[#2B2019]/60 block">Vytvořeno: {o.datum}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badges */}
                  {o.stav === 'NOVA' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Nová (Zpracovává se)
                    </span>
                  )}
                  {o.stav === 'DORUCENA' && (
                    <span className="px-3 py-1 bg-[#F0F2EC] text-[#6B7255] rounded-full text-xs font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Doručeno
                    </span>
                  )}
                  {o.stav === 'ZRUSENA' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" />
                      Zrušeno
                    </span>
                  )}

                  <span className="font-serif text-lg text-[#7A4B32] font-semibold">
                    {o.celkovaCena.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#2B2019]/80 space-y-1">
                <p><strong>Položky:</strong> {o.polozky}</p>
                {o.cisloZasilky && (
                  <p className="flex items-center gap-1.5 text-[#6B7255] font-medium pt-1">
                    <Truck className="w-4 h-4" />
                    Sledování Zásilkovny: <u>{o.cisloZasilky}</u>
                  </p>
                )}
              </div>

              {/* Customer Cancel Button for NEW status ONLY */}
              {o.stav === 'NOVA' && (
                <div className="pt-3 border-t border-[#E4D9C8]/40 flex justify-end">
                  <button
                    onClick={() => handleCancelOrder(o.id)}
                    className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-full transition-colors"
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
          <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-3">
            <span className="text-xs uppercase tracking-widest text-[#7A4B32] font-semibold">
              Výchozí doručovací adresa
            </span>
            <h4 className="font-serif text-lg text-[#2B2019]">Marie Nováková</h4>
            <p className="text-xs text-[#2B2019]/70 leading-relaxed">
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
        <div className="bg-white p-8 rounded-2xl border border-[#E4D9C8]/80 shadow-card max-w-xl space-y-6">
          <h3 className="font-serif text-2xl text-[#2B2019]">Osobní údaje &amp; GDPR Práva</h3>

          <div className="space-y-3 text-xs text-[#2B2019]/80">
            <p><strong>Jméno:</strong> Marie Nováková</p>
            <p><strong>E-mail:</strong> zakaznice@example.cz</p>
            <p><strong>Souhlas s newsletterem:</strong> Aktivní</p>
          </div>

          <div className="p-4 bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl text-xs space-y-2">
            <h4 className="font-semibold text-[#2B2019] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Smazání účtu a právo na výmaz (GDPR)
            </h4>
            <p className="text-[#2B2019]/70 leading-relaxed">
              Při smazání účtu anonymizujeme vaše osobní údaje. Zákonná účetní archivační povinnost nám ukládá uchovat daňové doklady objednávek po dobu stanovenou zákonem bez vazby na váš osobní profil.
            </p>
            <button
              onClick={() => alert('Požadavek na anonymizaci údajů byl zaznamenán.')}
              className="mt-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700"
            >
              Anonymizovat a smazat můj účet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
