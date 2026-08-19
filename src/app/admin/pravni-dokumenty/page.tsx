'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileText, Loader2, Lock, Plus, Scale } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { Hlaska } from '@/components/ui/PoleFormulare';

/**
 * Právní dokumenty – archiv znění, ne editor.
 *
 * Stránka umí přidat novou verzi a prohlédnout si staré. **Upravit uložené
 * znění nejde a nemá jít**: text, na který odkazuje objednávka, dokládá,
 * s čím zákaznice souhlasila. Editace by ten souhlas zpětně přepsala.
 *
 * Sloupec „objednávek" ukazuje, kolik jich na dané znění odkazuje. Je to
 * odpověď na otázku, kterou si u zámečku každý položí – proč to nejde smazat.
 */

interface Dokument {
  id: string;
  druh: string;
  verze: string;
  nadpis: string;
  ucinnostOd: string;
  createdAt: string;
  pocetObjednavek: number;
}

const DRUHY = [
  { klic: 'obchodni-podminky', nazev: 'Obchodní podmínky', cesta: '/obchodni-podminky' },
  { klic: 'reklamacni-rad', nazev: 'Reklamační řád', cesta: '/reklamacni-rad' },
  {
    klic: 'ochrana-osobnich-udaju',
    nazev: 'Ochrana osobních údajů',
    cesta: '/ochrana-osobnich-udaju',
  },
] as const;

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-xs text-linda-espresso disabled:opacity-60';

/** Dnešek ve tvaru `YYYY-MM-DD` pro `<input type="date">`. */
function dnes(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminPravniDokumentyPage() {
  const [dokumenty, setDokumenty] = useState<Dokument[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [ukladam, setUkladam] = useState(false);
  const [formularOtevren, setFormularOtevren] = useState(false);

  const [druh, setDruh] = useState<string>(DRUHY[0].klic);
  const [verze, setVerze] = useState(dnes());
  const [nadpis, setNadpis] = useState('Všeobecné obchodní podmínky');
  const [ucinnostOd, setUcinnostOd] = useState(dnes());
  const [obsah, setObsah] = useState('');

  const nacistData = useCallback(async () => {
    const vysledek = await nacist<{ dokumenty: Dokument[] }>('/api/admin/pravni-dokumenty');

    if (vysledek.ok) setDokumenty(vysledek.data.dokumenty);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistData();
  }, [nacistData]);

  const ulozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ukladam) return;

    setUkladam(true);
    setChyba(null);
    setChybyPoli({});
    setHlaska(null);

    const vysledek = await poslatJson<{ zprava: string }>('/api/admin/pravni-dokumenty', {
      druh,
      verze,
      nadpis,
      obsah,
      ucinnostOd,
    });

    if (vysledek.ok) {
      setHlaska(vysledek.data.zprava);
      setObsah('');
      setFormularOtevren(false);
      await nacistData();
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setUkladam(false);
  };

  const chybaPole = (klic: string) =>
    chybyPoli[klic] ? (
      <p role="alert" className="mt-1 text-[11px] font-medium text-red-800">
        {chybyPoli[klic]}
      </p>
    ) : null;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="flex items-center gap-2 font-serif text-3xl text-linda-espresso sm:text-4xl">
          <Scale className="h-7 w-7 text-linda-cognac" aria-hidden="true" />
          Právní dokumenty
        </h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Archiv znění, na která se odkazují objednávky
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
        <Lock className="mt-px h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Uložené znění se nedá upravit ani smazat.</strong> Ke
          každé objednávce se zapisuje verze podmínek, se kterou zákaznice souhlasila – kdyby šel
          text přepsat, změnil by se zpětně obsah jejího souhlasu. Opravu i drobnou změnu proto
          vložte jako <strong className="font-semibold">novou verzi</strong>. Ta stará zůstane
          čitelná u starých objednávek.
        </span>
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
      {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

      {!formularOtevren && (
        <button
          type="button"
          onClick={() => setFormularOtevren(true)}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Vložit nové znění
        </button>
      )}

      {formularOtevren && (
        <form
          onSubmit={(e) => void ulozit(e)}
          className="animate-fadeIn space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu"
        >
          <h2 className="font-serif text-xl text-linda-espresso">Nové znění</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="druh" className="mb-1 block text-xs font-semibold text-linda-espresso">
                Dokument
              </label>
              <select
                id="druh"
                value={druh}
                disabled={ukladam}
                onChange={(e) => setDruh(e.target.value)}
                className={`cursor-pointer ${POLE}`}
              >
                {DRUHY.map((d) => (
                  <option key={d.klic} value={d.klic}>
                    {d.nazev}
                  </option>
                ))}
              </select>
              {chybaPole('druh')}
            </div>

            <div>
              <label htmlFor="nadpis" className="mb-1 block text-xs font-semibold text-linda-espresso">
                Nadpis
              </label>
              <input
                id="nadpis"
                type="text"
                required
                value={nadpis}
                disabled={ukladam}
                onChange={(e) => setNadpis(e.target.value)}
                className={POLE}
              />
              {chybaPole('nadpis')}
            </div>

            <div>
              <label htmlFor="verze" className="mb-1 block text-xs font-semibold text-linda-espresso">
                Označení verze
              </label>
              <input
                id="verze"
                type="text"
                required
                value={verze}
                disabled={ukladam}
                onChange={(e) => setVerze(e.target.value)}
                placeholder="2026-08-18"
                aria-describedby="verze-napoveda"
                className={POLE}
              />
              <p id="verze-napoveda" className="mt-1 text-[11px] text-linda-espresso/70">
                Zapíše se ke každé objednávce. Datum je nejpraktičtější značení.
              </p>
              {chybaPole('verze')}
            </div>

            <div>
              <label
                htmlFor="ucinnostOd"
                className="mb-1 block text-xs font-semibold text-linda-espresso"
              >
                Účinné od
              </label>
              <input
                id="ucinnostOd"
                type="date"
                required
                value={ucinnostOd}
                disabled={ukladam}
                onChange={(e) => setUcinnostOd(e.target.value)}
                aria-describedby="ucinnostOd-napoveda"
                className={`cursor-pointer ${POLE}`}
              />
              <p id="ucinnostOd-napoveda" className="mt-1 text-[11px] text-linda-espresso/70">
                Budoucí datum můžete zadat dopředu – znění naskočí samo v ten den.
              </p>
              {chybaPole('ucinnostOd')}
            </div>
          </div>

          <div>
            <label htmlFor="obsah" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Text dokumentu
            </label>
            <textarea
              id="obsah"
              required
              rows={16}
              value={obsah}
              disabled={ukladam}
              onChange={(e) => setObsah(e.target.value)}
              placeholder={'## 1. Základní ustanovení\n\nTyto obchodní podmínky…'}
              aria-describedby="obsah-napoveda"
              className={`resize-y py-3 font-mono ${POLE}`}
            />
            <p id="obsah-napoveda" className="mt-1 text-[11px] text-linda-espresso/70">
              Nadpis sekce začněte dvěma křížky (<code>## 1. Nadpis</code>), odrážku pomlčkou,
              tučné dvěma hvězdičkami. Odstavce oddělte prázdným řádkem.
            </p>
            {chybaPole('obsah')}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={ukladam}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ukladam ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Ukládám…
                </>
              ) : (
                'Uložit znění'
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormularOtevren(false)}
              disabled={ukladam}
              className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám…
        </p>
      ) : dokumenty.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <AlertCircle className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím tu není žádné znění. Web zatím ukazuje výchozí text dodaný s e-shopem – ten se
            ale u objednávek nedá doložit. Vložte prosím vlastní znění.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {dokumenty.map((d) => {
            const druhInfo = DRUHY.find((x) => x.klic === d.druh);
            const ucinne = new Date(d.ucinnostOd) <= new Date();

            return (
              <li key={d.id} className="rounded-2xl bg-linda-cream p-4 shadow-neuSm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-linda-espresso">
                      <FileText className="h-4 w-4 shrink-0 text-linda-cognac" aria-hidden="true" />
                      {druhInfo?.nazev ?? d.druh} · verze {d.verze}
                    </p>
                    <p className="mt-0.5 text-[11px] text-linda-espresso/70">
                      {d.nadpis} · účinné od{' '}
                      {new Date(d.ucinnostOd).toLocaleDateString('cs-CZ')}
                      {d.pocetObjednavek > 0 && (
                        <> · odkazuje se na něj {d.pocetObjednavek} objednávek</>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        ucinne
                          ? 'bg-linda-sageLight text-linda-sage'
                          : 'bg-linda-sandLight text-linda-cognac shadow-neuInsetSm'
                      }`}
                    >
                      {ucinne ? 'Účinné' : 'Připravené'}
                    </span>

                    {druhInfo && (
                      <Link
                        href={`${druhInfo.cesta}?verze=${encodeURIComponent(d.verze)}`}
                        target="_blank"
                        className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-4 text-[11px] font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                      >
                        Zobrazit
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
