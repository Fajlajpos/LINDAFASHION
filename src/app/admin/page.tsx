'use client';

import React from 'react';
import Link from 'next/link';
import { Package, TrendingUp, AlertTriangle, Users, Plus, ArrowUpRight, RotateCcw, Clock } from 'lucide-react';

export default function AdminDashboardPage() {
  const stats = [
    { label: 'Nové objednávky', value: '4', change: '+2 dnes', icon: Package, color: 'bg-amber-500' },
    { label: 'Tržby tento měsíc', value: '148 500 Kč', change: '+18 % oproti minulému', icon: TrendingUp, color: 'bg-emerald-600' },
    { label: 'Docházející sklad', value: '3 položky', change: 'Kusů <= 2', icon: AlertTriangle, color: 'bg-rose-500' },
    { label: 'Čekající reklamace / vrácení', value: '1 k vyřízení', change: 'Sekce 6.1 requirement', icon: RotateCcw, color: 'bg-indigo-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D9C8] pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Dashboard &amp; Přehled obchodu</h1>
          <p className="text-xs text-[#2B2019]/60 mt-1">Vítejte v administraci LINDA FASHION</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/produkty/novy"
            className="px-4 py-2.5 bg-[#7A4B32] text-white text-xs font-semibold rounded-full hover:bg-[#633B26] transition-colors flex items-center gap-1.5 shadow-sm"
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
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#2B2019]/60">{s.label}</span>
                <div className={`p-2.5 rounded-xl text-white ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif text-3xl font-semibold text-[#2B2019] block">{s.value}</span>
                <span className="text-[10px] font-medium text-[#6B7255]">{s.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4D9C8]/40 pb-4">
            <h3 className="font-serif text-2xl text-[#2B2019]">Nejnovější objednávky</h3>
            <Link href="/admin/objednavky" className="text-xs text-[#7A4B32] font-semibold hover:underline flex items-center gap-1">
              Zobrazit všechny
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4D9C8]/40 text-[#2B2019]/60 uppercase">
                  <th className="pb-3 font-semibold">Objednávka</th>
                  <th className="pb-3 font-semibold">Zákaznice</th>
                  <th className="pb-3 font-semibold">Stav</th>
                  <th className="pb-3 font-semibold text-right">Cena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4D9C8]/30 text-[#2B2019]">
                <tr>
                  <td className="py-3 font-semibold">#LF-2026001</td>
                  <td className="py-3">Marie Nováková</td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold text-[10px]">
                      Nová
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">5 380 Kč</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold">#LF-2026002</td>
                  <td className="py-3">Eva Dvořáková</td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 bg-[#F0F2EC] text-[#6B7255] rounded-full font-semibold text-[10px]">
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
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
          <h3 className="font-serif text-2xl text-[#2B2019] border-b border-[#E4D9C8]/40 pb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Docházející sklad
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <span className="font-semibold text-rose-900 block">Vlněný kabát Venezia (vel. 38)</span>
              <span className="text-rose-700">Zbývá pouze 1 kus skladem</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <span className="font-semibold text-amber-900 block">Kašmírový svetr Roma</span>
              <span className="text-amber-700">Zbývají 2 kusy skladem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
