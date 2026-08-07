'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  Palmtree,
  Save,
  Share2,
  Truck,
} from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';

/**
 * Nastavení e-shopu (sekce 6.7 a 6.8).
 *
 * Dřív to byla maketa – hodnoty žily jen v `useState` a po obnovení stránky
 * zmizely. Teď se čtou i ukládají do tabulky `Settings`, ze které je bere
 * i veřejná část webu (banner dovolené, patička, ceny dopravy).
 */

interface Nastaveni {
  rezimDovolene: boolean;
  datumNavratu: string | null;
  zpravaProZakazniky: string | null;
  zablokovatObjednavky: boolean;
  nazevFirmy: string | null;
  icoFirmy: string | null;
  dicFirmy: string | null;
  adresaFirmy: string | null;
  telefonFirmy: string | null;
  emailFirmy: string | null;
  jePlatceDph: boolean;
  socialInstagram: string | null;
  socialFacebook: string | null;
  cenaDopravyZasilkovna: number | null;
  cenaDopravyPPL: number | null;
  cenaDopravyCeskaPosta: number | null;
  prahDopravaZdarma: number | null;
}

const PRAZDNE: Nastaveni = {
  rezimDovolene: false,
  datumNavratu: null,
  zpravaProZakazniky: null,
  zablokovatObjednavky: false,
  nazevFirmy: null,
  icoFirmy: null,
  dicFirmy: null,
  adresaFirmy: null,
  telefonFirmy: null,
  emailFirmy: null,
  jePlatceDph: false,
  socialInstagram: null,
  socialFacebook: null,
  cenaDopravyZasilkovna: null,
  cenaDopravyPPL: null,
  cenaDopravyCeskaPosta: null,
  prahDopravaZdarma: null,
};

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-xs text-linda-espresso disabled:opacity-60';

/** `<input type="date">` chce `YYYY-MM-DD`, databáze vrací ISO s časem. */
function naDatumInput(hodnota: string | null): string {
  return hodnota ? hodnota.slice(0, 10) : '';
}

export default function AdminNastaveniPage() {
  const [n, setN] = useState<Nastaveni>(PRAZDNE);
  const [nacitam, setNacitam] = useState(true);
  const [ukladam, setUkladam] = useState(false);
  const [ulozeno, setUlozeno] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const vysledek = await nacist<{ nastaveni: Nastaveni }>('/api/admin/nastaveni');
      if (vysledek.ok) setN({ ...PRAZDNE, ...vysledek.data.nastaveni });
      else setChyba(vysledek.chyba);
      setNacitam(false);
    })();
  }, []);

  const ulozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ukladam) return;

    setUkladam(true);
    setChyba(null);
    setChybyPoli({});
    setUlozeno(false);

    const vysledek = await poslatJson('/api/admin/nastaveni', n, 'PUT');

    if (vysledek.ok) {
      setUlozeno(true);
      // Potvrzení po chvíli zmizí, ať nezůstane viset na stránce natrvalo.
      setTimeout(() => setUlozeno(false), 4000);
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setUkladam(false);
  };

  const chybaPole = (klic: string) =>
    chybyPoli[klic] ? (
      <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
        {chybyPoli[klic]}
      </p>
    ) : null;

  if (nacitam) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Načítám nastavení…
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Nastavení webu</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Údaje se propisují do patičky, na faktury a do pokladny
        </p>
      </div>

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      {ulozeno && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage"
        >
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Nastavení bylo uloženo.
        </p>
      )}

      <form onSubmit={ulozit} className="space-y-8">
        {/* Režim dovolené */}
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <div className="flex items-start justify-between gap-4">
            <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
              <Palmtree className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
              Režim dovolené („Jsem pryč“)
            </h2>
            <input
              type="checkbox"
              aria-label="Aktivovat režim nepřítomnosti"
              checked={n.rezimDovolene}
              disabled={ukladam}
              onChange={(e) => setN({ ...n, rezimDovolene: e.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-linda-cognac"
            />
          </div>

          {n.rezimDovolene && (
            <div className="space-y-4">
              <div>
                <label htmlFor="datumNavratu" className="mb-1 block text-xs font-semibold text-linda-espresso">
                  Datum návratu *
                </label>
                <input
                  id="datumNavratu"
                  type="date"
                  disabled={ukladam}
                  value={naDatumInput(n.datumNavratu)}
                  onChange={(e) => setN({ ...n, datumNavratu: e.target.value || null })}
                  className={POLE}
                />
                {chybaPole('datumNavratu')}
              </div>

              <div>
                <label htmlFor="zprava" className="mb-1 block text-xs font-semibold text-linda-espresso">
                  Zpráva pro zákaznice
                </label>
                <textarea
                  id="zprava"
                  rows={2}
                  disabled={ukladam}
                  value={n.zpravaProZakazniky ?? ''}
                  onChange={(e) => setN({ ...n, zpravaProZakazniky: e.target.value || null })}
                  placeholder="Momentálně čerpáme dovolenou, objednávky budeme opět expedovat od {datum}."
                  className={POLE}
                />
                <p className="mt-1 text-[11px] text-linda-espresso/70">
                  Napíšete-li do textu <code className="font-semibold">{'{datum}'}</code>, doplní se datum návratu.
                  Necháte-li pole prázdné, použije se výchozí věta.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={n.zablokovatObjednavky}
                  disabled={ukladam}
                  onChange={(e) => setN({ ...n, zablokovatObjednavky: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
                />
                <span className="text-linda-espresso/85">
                  Během dovolené úplně zakázat objednávání. Odškrtnuté = zákaznice uvidí jen upozornění
                  a objednat může dál.
                </span>
              </label>
            </div>
          )}
        </section>

        {/* Firemní údaje */}
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
            <Building2 className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
            Firemní a kontaktní údaje
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ['nazevFirmy', 'Název firmy', 'LINDA FASHION s.r.o.'],
                ['icoFirmy', 'IČO', '12345678'],
                ['dicFirmy', 'DIČ', 'CZ12345678'],
                ['telefonFirmy', 'Telefon', '+420 777 888 999'],
                ['emailFirmy', 'E-mail', 'info@lindafashion.cz'],
                ['adresaFirmy', 'Adresa', 'Pařížská 12, 110 00 Praha 1'],
              ] as const
            ).map(([klic, popisek, priklad]) => (
              <div key={klic}>
                <label htmlFor={klic} className="mb-1 block text-xs font-semibold text-linda-espresso">
                  {popisek}
                </label>
                <input
                  id={klic}
                  type="text"
                  disabled={ukladam}
                  value={n[klic] ?? ''}
                  onChange={(e) => setN({ ...n, [klic]: e.target.value || null })}
                  placeholder={priklad}
                  className={POLE}
                />
                {chybaPole(klic)}
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-xs">
            <input
              type="checkbox"
              checked={n.jePlatceDph}
              disabled={ukladam}
              onChange={(e) => setN({ ...n, jePlatceDph: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
            />
            <span className="text-linda-espresso/85">
              Jsme plátce DPH. Ovlivní popis cen na webu a na dokladech (sekce 11).
            </span>
          </label>
        </section>

        {/* Sociální sítě */}
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
            <Share2 className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
            Sociální sítě
          </h2>
          <p className="text-[11px] text-linda-espresso/70">
            Ikona se v patičce zobrazí jen u vyplněného odkazu.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ['socialInstagram', 'Instagram', 'https://instagram.com/vas-profil'],
                ['socialFacebook', 'Facebook', 'https://facebook.com/vase-stranka'],
              ] as const
            ).map(([klic, popisek, priklad]) => (
              <div key={klic}>
                <label htmlFor={klic} className="mb-1 block text-xs font-semibold text-linda-espresso">
                  {popisek}
                </label>
                <input
                  id={klic}
                  type="url"
                  disabled={ukladam}
                  value={n[klic] ?? ''}
                  onChange={(e) => setN({ ...n, [klic]: e.target.value || null })}
                  placeholder={priklad}
                  className={POLE}
                />
                {chybaPole(klic)}
              </div>
            ))}
          </div>
        </section>

        {/* Doprava */}
        <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <h2 className="flex items-center gap-2 font-serif text-xl text-linda-espresso">
            <Truck className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
            Ceny dopravy
          </h2>
          <p className="text-[11px] text-linda-espresso/70">
            Ceny zadané ručně platí do doby, než se zapojí API dopravců. Prázdné pole = metoda se
            v pokladně nenabídne.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                ['cenaDopravyZasilkovna', 'Zásilkovna (Kč)'],
                ['cenaDopravyPPL', 'PPL (Kč)'],
                ['cenaDopravyCeskaPosta', 'Česká pošta (Kč)'],
              ] as const
            ).map(([klic, popisek]) => (
              <div key={klic}>
                <label htmlFor={klic} className="mb-1 block text-xs font-semibold text-linda-espresso">
                  {popisek}
                </label>
                <input
                  id={klic}
                  type="number"
                  min="0"
                  step="1"
                  disabled={ukladam}
                  value={n[klic] ?? ''}
                  onChange={(e) =>
                    setN({ ...n, [klic]: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  placeholder="79"
                  className={POLE}
                />
                {chybaPole(klic)}
              </div>
            ))}
          </div>

          <div className="sm:max-w-xs">
            <label htmlFor="prahDopravaZdarma" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Doprava zdarma od (Kč)
            </label>
            <input
              id="prahDopravaZdarma"
              type="number"
              min="0"
              step="1"
              disabled={ukladam}
              value={n.prahDopravaZdarma ?? ''}
              onChange={(e) =>
                setN({ ...n, prahDopravaZdarma: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder="2500"
              className={POLE}
            />
            <p className="mt-1 text-[11px] text-linda-espresso/70">Prázdné = doprava zdarma se nenabízí.</p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={ukladam}
            aria-busy={ukladam}
            className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {ukladam ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Ukládám…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Uložit nastavení
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
