'use client';

import React from 'react';
import Link from 'next/link';
import { Package, TrendingUp, AlertTriangle, Users, Plus, ArrowUpRight, RotateCcw, Clock } from 'lucide-react';

export default function AdminDashboardPage() {
  /* Barvy terčů jedou po značkové paletě – amber/emerald/rose/indigo z výchozí
     Tailwind palety se v teplém krémovém rozhraní tloukly. Červená zůstává
     jen tam, kde jde o skutečné varování (docházející sklad). */
  const stats = [
    { label: 'Nové objednávky', value: '4', change: '+2 dnes', icon: Package, color: 'bg-linda-cognac' },
    { label: 'Tržby tento měsíc', value: '148 500 Kč', change: '+18 % oproti minulému', icon: TrendingUp, color: 'bg-linda-sage' },
    { label: 'Docházející sklad', value: '3 položky', change: 'Kusů <= 2', icon: AlertTriangle, color: 'bg-red-700' },
    { label: 'Čekající reklamace / vrácení', value: '1 k vyřízení', change: 'Sekce 6.1 requirement', icon: RotateCcw, color: 'bg-linda-espresso' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-linda-sand pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">Dashboard &amp; Přehled obchodu</h1>
          <p className="text-xs text-linda-espresso/60 mt-1">Vítejte v administraci LINDA FASHION</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/produkty/novy"
            className="px-4 min-h-touch bg-linda-cognac text-white text-xs font-semibold rounded-full hover:bg-linda-cognacHover flex items-center gap-1.5 shadow-neuDark transition-all duration-200 active:shadow-neuSm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Přidat nový produkt
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-linda-espresso/75">{s.label}</span>
                <div className={`rounded-xl p-2.5 text-white shadow-neuDark ${s.color}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div>
                <span className="font-serif text-3xl font-semibold text-linda-espresso block">{s.value}</span>
                <span className="text-[10px] font-medium text-linda-sage">{s.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-8 bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
          <div className="flex items-center justify-between border-b border-linda-sand/40 pb-4">
            <h3 className="font-serif text-2xl text-linda-espresso">Nejnovější objednávky</h3>
            <Link href="/admin/objednavky" className="text-xs text-linda-cognac font-semibold hover:underline flex items-center gap-1">
              Zobrazit všechny
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-linda-sand/40 uppercase text-linda-espresso/75">
                  <th className="pb-3 font-semibold">Objednávka</th>
                  <th className="pb-3 font-semibold">Zákaznice</th>
                  <th className="pb-3 font-semibold">Stav</th>
                  <th className="pb-3 font-semibold text-right">Cena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linda-sand/30 text-linda-espresso">
                <tr>
                  <td className="py-3 font-semibold">#LF-2026001</td>
                  <td className="py-3">Marie Nováková</td>
                  <td className="py-3">
                    <span className="rounded-full bg-linda-sandLight px-2.5 py-1 text-[10px] font-semibold text-linda-espresso shadow-neuInsetSm">
                      Nová
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">5 380 Kč</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold">#LF-2026002</td>
                  <td className="py-3">Eva Dvořáková</td>
                  <td className="py-3">
                    <span className="rounded-full bg-linda-sageLight px-2.5 py-1 text-[10px] font-semibold text-linda-sage shadow-neuInsetSm">
                      Expedována
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">2 390 Kč</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Box */}
        <div className="lg:col-span-4 bg-linda-cream p-6 rounded-2xl shadow-neu space-y-4">
          <h2 className="flex items-center gap-2 border-b border-linda-sand/40 pb-4 font-serif text-2xl text-linda-espresso">
            <AlertTriangle className="h-5 w-5 text-red-700" aria-hidden="true" />
            Docházející sklad
          </h2>

          {/* Kritická položka drží červenou, mírnější varování jede na
              značkové písečné – rozliší je i ikona, ne jen odstín. */}
          <ul className="space-y-3 text-xs">
            <li className="space-y-1 rounded-xl bg-red-50 p-3 shadow-neuInsetSm">
              <span className="block font-semibold text-red-900">Vlněný kabát Venezia (vel. 38)</span>
              <span className="text-red-800">Zbývá pouze 1 kus skladem</span>
            </li>
            <li className="space-y-1 rounded-xl bg-linda-sandLight p-3 shadow-neuInsetSm">
              <span className="block font-semibold text-linda-espresso">Kašmírový svetr Roma</span>
              <span className="text-linda-espresso/80">Zbývají 2 kusy skladem</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
