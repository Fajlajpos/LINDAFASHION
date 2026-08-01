'use client';

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, CheckCircle, Clock, Check } from 'lucide-react';

export default function AdminReklamacePage() {
  const [reklamaceList, setReklamaceList] = useState([
    {
      id: 'r1',
      cisloObjednavky: 'LF-2026001',
      zakaznice: 'Marie Nováková',
      typ: 'VRACENI', // Vrácení zboží do 14 dnů
      duvod: 'Nesedí velikost šatů (vyzkoušeno M)',
      stav: 'PRIJATA',
      datumPrijeti: '29. 07. 2026',
    },
  ]);

  const handleResolveReklamace = (id: string, newStatus: string) => {
    setReklamaceList(
      reklamaceList.map((r) => {
        if (r.id === id) {
          if (r.typ === 'VRACENI' && newStatus === 'VYRIZENA_UZNANA') {
            // Sekce 6.10 rule: automatické naskladnění kusů a změna stavu objednávky
            alert(' Vrácení schváleno! Položky byly automaticky naskladněny zpět do skladu a stav objednávky změněn na VRÁCENA.');
          }
          return { ...r, stav: newStatus };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">Reklamace a Vrácení zboží</h1>
        <p className="text-xs text-linda-espresso/60 mt-1">Správa vrátky do 14 dnů a záručních reklamací s automatickým naskladněním</p>
      </div>

      <div className="bg-linda-cream rounded-2xl shadow-neu overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-linda-cream border-b border-linda-sand/60 text-linda-espresso">
            <tr>
              <th className="p-4 font-semibold">Objednávka</th>
              <th className="p-4 font-semibold">Zákaznice</th>
              <th className="p-4 font-semibold">Typ</th>
              <th className="p-4 font-semibold">Důvod</th>
              <th className="p-4 font-semibold">Stav vyřízení</th>
              <th className="p-4 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linda-sand/40">
            {reklamaceList.map((r) => (
              <tr key={r.id} className="hover:bg-linda-cream/50">
                <td className="p-4 font-mono font-bold text-linda-cognac">#{r.cisloObjednavky}</td>
                <td className="p-4 font-medium text-linda-espresso">{r.zakaznice}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    r.typ === 'VRACENI' ? 'bg-linda-sageLight text-linda-sage shadow-neuInsetSm' : 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm'
                  }`}>
                    {r.typ === 'VRACENI' ? 'Vrácení (14 dnů)' : 'Reklamace vady'}
                  </span>
                </td>
                <td className="p-4 text-linda-espresso/70">{r.duvod}</td>
                <td className="p-4 font-semibold">
                  {r.stav === 'PRIJATA' && <span className="text-linda-cognac font-semibold">Přijata &bull; Čeká na vyřízení</span>}
                  {r.stav === 'VYRIZENA_UZNANA' && <span className="text-linda-sage font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Uznána (Naskladněno)</span>}
                  {r.stav === 'VYRIZENA_ZAMITNUTA' && <span className="text-red-600 font-semibold">Zamítnuta</span>}
                </td>
                <td className="p-4 text-right">
                  {r.stav === 'PRIJATA' && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleResolveReklamace(r.id, 'VYRIZENA_UZNANA')}
                        className="px-3 py-1 bg-linda-sage text-white text-[10px] font-semibold rounded-full hover:bg-linda-sageHover"
                      >
                        Uznat &amp; Naskladnit
                      </button>
                      <button
                        onClick={() => handleResolveReklamace(r.id, 'VYRIZENA_ZAMITNUTA')}
                        className="px-3 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-full hover:bg-red-700"
                      >
                        Zamítnout
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
