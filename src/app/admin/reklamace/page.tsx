'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { STAV_REKLAMACE } from '@/lib/objednavka-popisky';

interface Reklamace {
  id: string;
  typ: 'REKLAMACE' | 'VRACENI';
  stav: string;
  duvod: string | null;
  poznamkaAdmina: string | null;
  datumPrijeti: string;
  datumVyrizeni: string | null;
  cisloObjednavky: string;
  orderId: string;
  zakaznik: string;
  polozka: string | null;
}

const STAVY = ['PRIJATA', 'RESI_SE', 'VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA'];

/**
 * Přehled reklamací a vrácení (sekce 6.10).
 *
 * Uznané vrácení vrací kusy na sklad – server to udělá sám, tady jen
 * upozorníme, že se to stalo.
 */
export default function AdminReklamacePage() {
  const [reklamace, setReklamace] = useState<Reklamace[]>([]);
  /** Kolik jich je celkem – server posílá nejvýš 200 nevyřízených napřed. */
  const [celkem, setCelkem] = useState(0);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [meniId, setMeniId] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);

  const nacistData = useCallback(async () => {
    const vysledek = await nacist<{ reklamace: Reklamace[]; celkem: number }>(
      '/api/admin/reklamace'
    );

    if (vysledek.ok) {
      setReklamace(vysledek.data.reklamace);
      setCelkem(vysledek.data.celkem);
    } else {
      setChyba(vysledek.chyba);
    }

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistData();
  }, [nacistData]);

  const zmenitStav = async (r: Reklamace, novyStav: string) => {
    if (novyStav === 'VYRIZENA_UZNANA' && r.typ === 'VRACENI') {
      const potvrzeno = window.confirm(
        'Uznáním vrácení se kusy automaticky vrátí na sklad. Pokračovat?'
      );
      if (!potvrzeno) return;
    }

    setMeniId(r.id);
    setChyba(null);
    setHlaska(null);

    const vysledek = await poslatJson<{ vracenoNaSklad: boolean }>(
      `/api/admin/reklamace/${r.id}`,
      { stav: novyStav, poznamkaAdmina: r.poznamkaAdmina },
      'PATCH'
    );

    if (vysledek.ok) {
      if (vysledek.data.vracenoNaSklad) setHlaska('Kusy byly vráceny na sklad.');
      await nacistData();
    } else {
      setChyba(vysledek.chyba);
    }

    setMeniId(null);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Reklamace a vrácení</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Nové záznamy se zakládají v detailu konkrétní objednávky
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

      {hlaska && (
        <p
          role="status"
          className="rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage"
        >
          {hlaska}
        </p>
      )}

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám…
        </p>
      ) : reklamace.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <AlertTriangle className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            Zatím žádná reklamace ani vrácení. To je dobrá zpráva.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {celkem > reklamace.length && (
            <li className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
              Zobrazeno {reklamace.length} z {celkem}. Nevyřízené jsou vždy nahoře, ořízl se tedy
              jen nejstarší vyřízený konec seznamu.
            </li>
          )}

          {reklamace.map((r) => {
            const popis = STAV_REKLAMACE[r.stav] ?? { text: r.stav, tridy: 'bg-linda-sandLight' };

            return (
              <li key={r.id} className="space-y-3 rounded-2xl bg-linda-cream p-4 shadow-neuSm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-linda-espresso">
                      {r.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'} ·{' '}
                      <Link
                        href={`/admin/objednavky/${r.orderId}`}
                        className="text-linda-cognac underline"
                      >
                        {r.cisloObjednavky}
                      </Link>
                    </p>
                    <p className="text-[11px] text-linda-espresso/70">
                      {r.zakaznik}
                      {r.polozka && ` · ${r.polozka}`}
                      {!r.polozka && ' · celá objednávka'}
                    </p>
                    {r.duvod && <p className="mt-1 text-xs text-linda-espresso/85">{r.duvod}</p>}
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}>
                    {popis.text}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor={`stav-${r.id}`} className="text-[11px] font-semibold text-linda-espresso">
                    Změnit stav:
                  </label>
                  <select
                    id={`stav-${r.id}`}
                    value={r.stav}
                    disabled={meniId === r.id}
                    onChange={(e) => void zmenitStav(r, e.target.value)}
                    className="min-h-touch cursor-pointer rounded-lg bg-linda-sandLight px-3 text-xs text-linda-espresso shadow-neuInsetSm disabled:opacity-60"
                  >
                    {STAVY.map((s) => (
                      <option key={s} value={s}>
                        {STAV_REKLAMACE[s]?.text ?? s}
                      </option>
                    ))}
                  </select>
                  {meniId === r.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-linda-cognac" aria-hidden="true" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
