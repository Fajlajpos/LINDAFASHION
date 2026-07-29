'use client';

import React, { useState } from 'react';
import { Package, Truck, CheckCircle, Clock, Ban, Eye, Search, Filter } from 'lucide-react';

export default function AdminObjednavkyPage() {
  const [orders, setOrders] = useState([
    {
      id: 'o1',
      cisloObjednavky: 'LF-2026001',
      datum: '29. 07. 2026',
      zakaznik: 'Marie Nováková (zakaznice@example.cz)',
      adresa: 'Vodičkova 45, Praha 1',
      doprava: 'Zásilkovna (Z-BOX Vodičkova)',
      platba: 'Bankovní převod',
      celkovaCena: 5380,
      stav: 'NOVA',
      cisloZasilky: '',
      zrusil: null,
    },
    {
      id: 'o2',
      cisloObjednavky: 'LF-2026002',
      datum: '15. 06. 2026',
      zakaznik: 'Eva Dvořáková',
      adresa: 'Dlouhá 12, Brno',
      doprava: 'PPL Doručení na adresu',
      platba: 'Platba kartou online (GoPay)',
      celkovaCena: 2390,
      stav: 'EXPEDOVANA',
      cisloZasilky: 'ZAS-88741299',
      zrusil: null,
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [trackingInput, setTrackingInput] = useState('');

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, stav: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, stav: newStatus });
    }
  };

  const handleSaveTracking = (orderId: string) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, cisloZasilky: trackingInput } : o))
    );
    alert(`Sledovací číslo ${trackingInput} uloženo. E-mail odeslán zákaznici.`);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Správa objednávek</h1>
        <p className="text-xs text-[#2B2019]/60 mt-1">Zpracování objednávek, změna stavů a zadávání sledovacích čísel</p>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E4D9C8]/60 text-[#2B2019]">
            <tr>
              <th className="p-4 font-semibold">Číslo objednávky</th>
              <th className="p-4 font-semibold">Zákazník</th>
              <th className="p-4 font-semibold">Doprava &amp; Platba</th>
              <th className="p-4 font-semibold">Cena</th>
              <th className="p-4 font-semibold">Stav</th>
              <th className="p-4 font-semibold text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4D9C8]/40">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[#FAF8F4]/50">
                <td className="p-4 font-bold text-[#7A4B32]">#{o.cisloObjednavky}</td>
                <td className="p-4 text-[#2B2019]">{o.zakaznik}</td>
                <td className="p-4 text-[#2B2019]/70">{o.doprava}</td>
                <td className="p-4 font-semibold">{o.celkovaCena.toLocaleString('cs-CZ')} Kč</td>
                <td className="p-4">
                  <select
                    value={o.stav}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="bg-[#FAF8F4] border border-[#E4D9C8] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value="NOVA">Nová</option>
                    <option value="ZPRACOVAVA_SE">Zpracovává se</option>
                    <option value="EXPEDOVANA">Expedována</option>
                    <option value="DORUCENA">Doručena</option>
                    <option value="ZRUSENA">Zrušena</option>
                    <option value="VRACENA">Vrácena</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedOrder(o);
                      setTrackingInput(o.cisloZasilky || '');
                    }}
                    className="px-3 py-1 bg-[#2B2019] text-white text-[11px] font-semibold rounded-full hover:bg-[#7A4B32]"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 border border-[#E4D9C8] relative">
            <div className="flex justify-between items-center border-b border-[#E4D9C8]/60 pb-3">
              <h3 className="font-serif text-2xl text-[#2B2019]">Detail objednávky #{selectedOrder.cisloObjednavky}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-[#2B2019] font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#2B2019]/80">
              <p><strong>Zákazník:</strong> {selectedOrder.zakaznik}</p>
              <p><strong>Doručovací adresa:</strong> {selectedOrder.adresa}</p>
              <p><strong>Doprava:</strong> {selectedOrder.doprava}</p>
              <p><strong>Platba:</strong> {selectedOrder.platba}</p>
              <p><strong>Celková cena:</strong> {selectedOrder.celkovaCena.toLocaleString('cs-CZ')} Kč</p>
              {selectedOrder.zrusil && (
                <p className="text-red-600 font-semibold">
                  ⚠️ Objednávku zrušil(a): {selectedOrder.zrusil === 'ZAKAZNICE' ? 'Zákaznice sama v profilu' : 'Administrátor'}
                </p>
              )}
            </div>

            {/* Tracking Number Input */}
            <div className="p-4 bg-[#FAF8F4] rounded-2xl border border-[#E4D9C8] space-y-2">
              <label className="block text-xs font-semibold text-[#2B2019] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#7A4B32]" />
                Sledovací číslo zásilky od dopravce:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Např. ZAS-99887766"
                  className="flex-1 bg-white border border-[#E4D9C8] rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
                <button
                  onClick={() => handleSaveTracking(selectedOrder.id)}
                  className="px-4 py-2 bg-[#7A4B32] text-white text-xs font-semibold rounded-xl hover:bg-[#633B26]"
                >
                  Uložit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
