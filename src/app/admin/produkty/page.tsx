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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-linda-sand pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">Správa produktů</h1>
          <p className="text-xs text-linda-espresso/60 mt-1">Přehled nabízeného zboží, variant a mír</p>
        </div>

        <Link
          href="/admin/produkty/novy"
          className="px-5 min-h-touch bg-linda-cognac text-white text-xs font-semibold rounded-full hover:bg-linda-cognacHover flex items-center gap-1.5 shadow-neuDark transition-all duration-200 active:shadow-neuSm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Přidat nový produkt
        </Link>
      </div>

      <div className="bg-linda-cream rounded-2xl shadow-neu overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-linda-cream border-b border-linda-sand/60 text-linda-espresso">
            <tr>
              <th className="p-4 font-semibold">Název produktu</th>
              <th className="p-4 font-semibold">Kategorie</th>
              <th className="p-4 font-semibold">Cena</th>
              <th className="p-4 font-semibold">Sklad celkem</th>
              <th className="p-4 font-semibold">Stav</th>
              <th className="p-4 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linda-sand/40">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-linda-cream/50 transition-colors">
                <td className="p-4 font-medium text-linda-espresso flex items-center gap-2">
                  {p.jeDarkovyPoukaz ? (
                    <span className="p-1 bg-linda-espresso text-linda-sand rounded">
                      <Gift className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 bg-linda-cognac/10 text-linda-cognac rounded">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span>{p.nazev}</span>
                </td>
                <td className="p-4 text-linda-espresso/70">{p.kategorie}</td>
                <td className="p-4 font-semibold text-linda-cognac">{p.cena.toLocaleString('cs-CZ')} Kč</td>
                <td className="p-4 font-medium">{p.skladCelkem} ks</td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive(p.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      p.aktivni ? 'bg-linda-sageLight text-linda-sage' : 'bg-linda-sandLight text-linda-espresso/80 shadow-neuInsetSm'
                    }`}
                  >
                    {p.aktivni ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {p.aktivni ? 'Aktivní' : 'Skryté'}
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <Link
                    href={`/admin/produkty/novy?edit=${p.id}`}
                    className="inline-flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>

                  {/* Section 6.2 Safety Rule: Hide physical delete button if product is in orders */}
                  {!p.hasOrders ? (
                    <button
                      onClick={() => setProducts(products.filter((item) => item.id !== p.id))}
                      className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-700 active:shadow-neuInsetSm"
                      title="Smazat produkt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full bg-linda-sandLight text-linda-espresso/50 shadow-neuInsetSm cursor-not-allowed"
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
