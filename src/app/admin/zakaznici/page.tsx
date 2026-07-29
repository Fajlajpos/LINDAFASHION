'use client';

import React, { useState } from 'react';
import { Users, Mail, Phone, Calendar, ShoppingBag, Eye } from 'lucide-react';

export default function AdminZakazniciPage() {
  const [customers, setCustomers] = useState([
    {
      id: 'u1',
      jmeno: 'Marie Nováková',
      email: 'zakaznice@example.cz',
      telefon: '+420 608 112 233',
      pocetObjednavek: 2,
      celkovaUtrata: 7770,
      posledniObjednavka: '29. 07. 2026',
      adresa: 'Vodičkova 45, 110 00 Praha 1',
    },
    {
      id: 'u2',
      jmeno: 'Eva Dvořáková',
      email: 'eva.dvorakova@example.cz',
      telefon: '+420 777 123 456',
      pocetObjednavek: 1,
      celkovaUtrata: 2390,
      posledniObjednavka: '15. 06. 2026',
      adresa: 'Dlouhá 12, 602 00 Brno',
    },
  ]);

  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Zákaznická databáze</h1>
        <p className="text-xs text-[#2B2019]/60 mt-1">Přehled registrovaných zákaznic, historie nákupů a celková útrata (LTV)</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E4D9C8]/60 text-[#2B2019]">
            <tr>
              <th className="p-4 font-semibold">Jméno a příjmení</th>
              <th className="p-4 font-semibold">E-mail</th>
              <th className="p-4 font-semibold">Telefon</th>
              <th className="p-4 font-semibold">Objednávky</th>
              <th className="p-4 font-semibold">Celková útrata</th>
              <th className="p-4 font-semibold text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4D9C8]/40">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-[#FAF8F4]/50">
                <td className="p-4 font-semibold text-[#2B2019] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#7A4B32]" />
                  {c.jmeno}
                </td>
                <td className="p-4 text-[#2B2019]/70">{c.email}</td>
                <td className="p-4 text-[#2B2019]/70">{c.telefon}</td>
                <td className="p-4 font-medium">{c.pocetObjednavek}x</td>
                <td className="p-4 font-semibold text-[#7A4B32]">{c.celkovaUtrata.toLocaleString('cs-CZ')} Kč</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedCustomer(c)}
                    className="p-1.5 bg-[#FAF8F4] text-[#7A4B32] hover:bg-[#7A4B32] hover:text-white rounded-lg border border-[#E4D9C8]"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal for Owner */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 border border-[#E4D9C8] relative">
            <div className="flex justify-between items-center border-b border-[#E4D9C8]/60 pb-3">
              <h3 className="font-serif text-2xl text-[#2B2019]">{selectedCustomer.jmeno}</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#2B2019]">
              <p><strong>E-mail:</strong> {selectedCustomer.email}</p>
              <p><strong>Telefon:</strong> {selectedCustomer.telefon}</p>
              <p><strong>Doručovací adresa:</strong> {selectedCustomer.adresa}</p>
              <p><strong>Počet vytvořených objednávek:</strong> {selectedCustomer.pocetObjednavek}</p>
              <p><strong>Celková tržba (LTV):</strong> <span className="text-[#7A4B32] font-semibold">{selectedCustomer.celkovaUtrata.toLocaleString('cs-CZ')} Kč</span></p>
              <p><strong>Poslední nákup:</strong> {selectedCustomer.posledniObjednavka}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
