'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Palmtree, Building, Truck, Share2, Check, AlertCircle } from 'lucide-react';

export default function AdminNastaveniPage() {
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    // Vacation mode (Sekce 6.7)
    rezimDovolene: false,
    datumNavratu: '2026-08-15',
    zpravaProZakazniky: 'Momentálně čerpáme dovolenou. Objednávky budeme opět expedovat od {datum}.',
    zablokovatObjednavky: false,

    // Firemní údaje (Sekce 6.8 & 7)
    nazevFirmy: 'LINDA FASHION s.r.o.',
    icoFirmy: '12345678',
    dicFirmy: 'CZ12345678',
    adresaFirmy: 'Pařížská 12, 110 00 Praha 1',
    telefonFirmy: '+420 777 888 999',
    emailFirmy: 'info@lindafashion.cz',
    jePlatceDph: true,

    // Ceny dopravy & prah
    cenaDopravyZasilkovna: '79',
    cenaDopravyPPL: '109',
    cenaDopravyCeskaPosta: '99',
    prahDopravaZdarma: '2500',

    // Sociální sítě
    socialInstagram: 'https://instagram.com/lindafashion_cz',
    socialFacebook: 'https://facebook.com/lindafashion.cz',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Nastavení obchodu</h1>
        <p className="text-xs text-[#2B2019]/60 mt-1">Konfigurace dovolené, firemních údajů, cen dopravy a sociálních sítí</p>
      </div>

      {saved && (
        <div className="p-4 bg-[#F0F2EC] border border-[#6B7255] text-[#2B2019] rounded-2xl text-xs flex items-center gap-2">
          <Check className="w-5 h-5 text-[#6B7255]" />
          <span>Nastavení bylo úspěšně uloženo!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Režim dovolené (Sekce 6.7) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4D9C8]/40 pb-3">
            <h3 className="font-serif text-xl text-[#2B2019] flex items-center gap-2">
              <Palmtree className="w-5 h-5 text-[#7A4B32]" />
              Režim dovolené ("Jsem pryč")
            </h3>
            <input
              type="checkbox"
              checked={settings.rezimDovolene}
              onChange={(e) => setSettings({ ...settings, rezimDovolene: e.target.checked })}
              className="w-5 h-5 accent-[#7A4B32] cursor-pointer"
            />
          </div>

          {settings.rezimDovolene && (
            <div className="space-y-4 text-xs pt-2 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#2B2019] mb-1">Datum návratu *</label>
                  <input
                    type="date"
                    value={settings.datumNavratu}
                    onChange={(e) => setSettings({ ...settings, datumNavratu: e.target.value })}
                    className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="blockOrder"
                    checked={settings.zablokovatObjednavky}
                    onChange={(e) => setSettings({ ...settings, zablokovatObjednavky: e.target.checked })}
                    className="w-4 h-4 accent-[#7A4B32]"
                  />
                  <label htmlFor="blockOrder" className="font-semibold text-[#2B2019]">
                    Úplně zablokovat tlačítka pro vytváření objednávek
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2B2019] mb-1">
                  Text oznámení pro zákazníky na webu (proměnná &#123;datum&#125; se automaticky nahradí):
                </label>
                <textarea
                  rows={2}
                  value={settings.zpravaProZakazniky}
                  onChange={(e) => setSettings({ ...settings, zpravaProZakazniky: e.target.value })}
                  className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Firemní & Kontaktní údaje (Sekce 6.8 & 7) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
          <h3 className="font-serif text-xl text-[#2B2019] flex items-center gap-2">
            <Building className="w-5 h-5 text-[#7A4B32]" />
            Firemní a kontaktní údaje
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">Název firmy / podnikatele</label>
              <input
                type="text"
                value={settings.nazevFirmy}
                onChange={(e) => setSettings({ ...settings, nazevFirmy: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">Sídlo / Adresa</label>
              <input
                type="text"
                value={settings.adresaFirmy}
                onChange={(e) => setSettings({ ...settings, adresaFirmy: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">IČO</label>
              <input
                type="text"
                value={settings.icoFirmy}
                onChange={(e) => setSettings({ ...settings, icoFirmy: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">DIČ</label>
              <input
                type="text"
                value={settings.dicFirmy}
                onChange={(e) => setSettings({ ...settings, dicFirmy: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>
          </div>
        </div>

        {/* Ceny dopravy & Práh dopravy zdarma */}
        <div className="bg-white p-6 rounded-2xl border border-[#E4D9C8]/80 shadow-card space-y-4">
          <h3 className="font-serif text-xl text-[#2B2019] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#7A4B32]" />
            Ceny dopravy &amp; Práh zdarma
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">Zásilkovna (Kč)</label>
              <input
                type="number"
                value={settings.cenaDopravyZasilkovna}
                onChange={(e) => setSettings({ ...settings, cenaDopravyZasilkovna: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">PPL (Kč)</label>
              <input
                type="number"
                value={settings.cenaDopravyPPL}
                onChange={(e) => setSettings({ ...settings, cenaDopravyPPL: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">Česká pošta (Kč)</label>
              <input
                type="number"
                value={settings.cenaDopravyCeskaPosta}
                onChange={(e) => setSettings({ ...settings, cenaDopravyCeskaPosta: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2B2019] mb-1">Práh dopravy zdarma (Kč)</label>
              <input
                type="number"
                value={settings.prahDopravaZdarma}
                onChange={(e) => setSettings({ ...settings, prahDopravaZdarma: e.target.value })}
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 font-bold text-[#7A4B32]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 bg-[#7A4B32] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#633B26] shadow-md"
          >
            Uložit kompletní nastavení
          </button>
        </div>
      </form>
    </div>
  );
}
