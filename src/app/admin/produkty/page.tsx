'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Eye, EyeOff, Trash2, Gift, Sparkles, AlertCircle } from 'lucide-react';

export default function AdminProduktyPage() {
  const [products, setProducts] = useState([
    {
      id: 'p1',
      nazev: 'Hedvábné šaty Bellissima',
      kategorie: 'Šaty',
      cena: 3490,
      skladCelkem: 10,
      aktivni: true,
      jeDarkovyPoukaz: false,
      hasOrders: true, // Objevuje se v objednávce => ZÁKAZ MAZÁNÍ (Section 6.2)
    },
    {
      id: 'p2',
      nazev: 'Lněná halenka Firenze',
      kategorie: 'Halenky & Košile',
      cena: 1890,
      skladCelkem: 10,
      aktivni: true,
      jeDarkovyPoukaz: false,
      hasOrders: false,
    },
    {
      id: 'p5',
      nazev: 'Dárkový poukaz LINDA FASHION',
      kategorie: 'Dárkové poukazy',
      cena: 1000,
      skladCelkem: 400,
      aktivni: true,
      jeDarkovyPoukaz: true,
      hasOrders: true,
    },
  ]);

  const toggleActive = (id: string) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, aktivni: !p.aktivni } : p)));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4D9C8] pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Správa produktů</h1>
          <p className="text-xs text-[#2B2019]/60 mt-1">Přehled nabízeného zboží, variant a mír</p>
        </div>

        <Link
          href="/admin/produkty/novy"
          className="px-5 py-2.5 bg-[#7A4B32] text-white text-xs font-semibold rounded-full hover:bg-[#633B26] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Přidat nový produkt
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E4D9C8]/60 text-[#2B2019]">
            <tr>
              <th className="p-4 font-semibold">Název produktu</th>
              <th className="p-4 font-semibold">Kategorie</th>
              <th className="p-4 font-semibold">Cena</th>
              <th className="p-4 font-semibold">Sklad celkem</th>
              <th className="p-4 font-semibold">Stav</th>
              <th className="p-4 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4D9C8]/40">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                <td className="p-4 font-medium text-[#2B2019] flex items-center gap-2">
                  {p.jeDarkovyPoukaz ? (
                    <span className="p-1 bg-[#2B2019] text-[#E4D9C8] rounded">
                      <Gift className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 bg-[#7A4B32]/10 text-[#7A4B32] rounded">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span>{p.nazev}</span>
                </td>
                <td className="p-4 text-[#2B2019]/70">{p.kategorie}</td>
                <td className="p-4 font-semibold text-[#7A4B32]">{p.cena.toLocaleString('cs-CZ')} Kč</td>
                <td className="p-4 font-medium">{p.skladCelkem} ks</td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive(p.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      p.aktivni ? 'bg-[#F0F2EC] text-[#6B7255]' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.aktivni ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {p.aktivni ? 'Aktivní' : 'Skryté'}
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <Link
                    href={`/admin/produkty/novy?edit=${p.id}`}
                    className="p-1.5 text-gray-600 hover:text-[#7A4B32] inline-block"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>

                  {/* Section 6.2 Safety Rule: Hide physical delete button if product is in orders */}
                  {!p.hasOrders ? (
                    <button
                      onClick={() => setProducts(products.filter((item) => item.id !== p.id))}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title="Smazat produkt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="p-1.5 text-gray-300 cursor-not-allowed inline-block"
                      title="Produkt se objevuje v objednávce (smazání je zablokováno kvůli historii)"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </span>
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
