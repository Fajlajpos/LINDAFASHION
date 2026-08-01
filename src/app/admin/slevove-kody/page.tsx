'use client';

import React, { useState } from 'react';
import { Tag, Gift, Plus, Trash2 } from 'lucide-react';

export default function AdminSlevoveKodyPage() {
  const [discountCodes, setDiscountCodes] = useState([
    { id: 'd1', kod: 'VITAJTE10', procento: 10, pocetPouziti: 5, limitPouziti: 100, aktivni: true },
    { id: 'd2', kod: 'LINDA15', procento: 15, pocetPouziti: 12, limitPouziti: 50, aktivni: true },
  ]);

  const [giftCards, setGiftCards] = useState([
    { id: 'g1', kod: 'GIFT-LINDA-1000-XYZ', castka: 1000, zustatek: 1000, aktivni: true },
  ]);

  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('10');

  const handleAddCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode) {
      setDiscountCodes([
        ...discountCodes,
        { id: `d_${Date.now()}`, kod: newCode.toUpperCase(), procento: Number(newPercent), pocetPouziti: 0, limitPouziti: 100, aktivni: true },
      ]);
      setNewCode('');
    }
  };

  const handleGenerateGiftCard = () => {
    const code = `GIFT-LINDA-${Math.floor(1000 + Math.random() * 9000)}`;
    setGiftCards([
      ...giftCards,
      { id: `g_${Date.now()}`, kod: code, castka: 1000, zustatek: 1000, aktivni: true },
    ]);
  };

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">Slevové kódy &amp; Dárkové poukazy</h1>
        <p className="text-xs text-linda-espresso/60 mt-1">Správa procentuálních slev a dárkových poukazů jako platidla</p>
      </div>

      {/* Slevové kódy */}
      <div className="space-y-4">
        <h3 className="font-serif text-2xl text-linda-espresso flex items-center gap-2">
          <Tag className="w-5 h-5 text-linda-cognac" />
          Slevové kódy (% sleva z prodejní ceny)
        </h3>

        <form onSubmit={handleAddCode} className="p-4 bg-linda-cream rounded-2xl shadow-neu flex gap-4 text-xs">
          <input
            type="text"
            required
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Kód (např. LETO20)"
            className="flex-1 bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 uppercase"
          />
          <input
            type="number"
            required
            value={newPercent}
            onChange={(e) => setNewPercent(e.target.value)}
            placeholder="Sleva %"
            className="w-24 bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5"
          />
          <button type="submit" className="px-6 min-h-touch bg-linda-cognac text-white font-semibold rounded-xl hover:bg-linda-cognacHover flex items-center gap-1 shadow-neuDark transition-all duration-200 active:shadow-neuSm cursor-pointer">
            <Plus className="w-4 h-4" /> Vytvořit kód
          </button>
        </form>

        <div className="bg-linda-cream rounded-2xl shadow-neu overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-linda-cream border-b border-linda-sand/60 text-linda-espresso">
              <tr>
                <th className="p-4 font-semibold">Kód slevy</th>
                <th className="p-4 font-semibold">Výše slevy</th>
                <th className="p-4 font-semibold">Použití</th>
                <th className="p-4 font-semibold text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linda-sand/40">
              {discountCodes.map((d) => (
                <tr key={d.id}>
                  <td className="p-4 font-mono font-bold text-linda-cognac">{d.kod}</td>
                  <td className="p-4 font-semibold">{d.procento} %</td>
                  <td className="p-4 text-linda-espresso/70">{d.pocetPouziti} / {d.limitPouziti || '∞'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setDiscountCodes(discountCodes.filter((item) => item.id !== d.id))} className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-700 active:shadow-neuInsetSm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dárkové poukazy */}
      <div className="space-y-4 pt-6 border-t border-linda-sand">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-2xl text-linda-espresso flex items-center gap-2">
            <Gift className="w-5 h-5 text-linda-cognac" />
            Dárkové poukazy (Platidlo)
          </h3>
          <button
            onClick={handleGenerateGiftCard}
            className="px-4 py-2 bg-linda-espresso text-white text-xs font-semibold rounded-full hover:bg-linda-cognac flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Vygenerovat nový poukaz
          </button>
        </div>

        <div className="bg-linda-cream rounded-2xl shadow-neu overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-linda-cream border-b border-linda-sand/60 text-linda-espresso">
              <tr>
                <th className="p-4 font-semibold">Unikátní kód poukazu</th>
                <th className="p-4 font-semibold">Původní hodnota</th>
                <th className="p-4 font-semibold">Zbývající zůstatek</th>
                <th className="p-4 font-semibold">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linda-sand/40">
              {giftCards.map((g) => (
                <tr key={g.id}>
                  <td className="p-4 font-mono font-bold text-linda-espresso">{g.kod}</td>
                  <td className="p-4 font-medium">{g.castka.toLocaleString('cs-CZ')} Kč</td>
                  <td className="p-4 font-semibold text-linda-sage">{g.zustatek.toLocaleString('cs-CZ')} Kč</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-linda-sageLight text-linda-sage font-semibold rounded-full text-[10px]">
                      Aktivní
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
