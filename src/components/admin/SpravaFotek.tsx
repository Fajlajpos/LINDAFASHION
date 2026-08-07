'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Check, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { nacist, poslatFormData, poslatJson } from '@/lib/api-klient';

export interface AdminFotka {
  id: string;
  url: string | null;
  urlMedium: string | null;
  urlThumb: string | null;
  sirka: number | null;
  vyska: number | null;
  altText: string | null;
  poradi: number;
  jeHlavni: boolean;
  stavZpracovani: 'CEKA' | 'ZPRACOVAVA_SE' | 'HOTOVO' | 'CHYBA';
  chybaDuvod: string | null;
}

interface Props {
  productId: string;
  pocatecniFotky: AdminFotka[];
}

/** Jak často se ptáme na stav zpracování (sekce 9, krok 5 – polling stačí). */
const INTERVAL_MS = 2500;

export function SpravaFotek({ productId, pocatecniFotky }: Props) {
  const [fotky, setFotky] = useState<AdminFotka[]>(pocatecniFotky);
  const [nahravam, setNahravam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const casovac = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cekaNaZpracovani = fotky.some(
    (f) => f.stavZpracovani === 'CEKA' || f.stavZpracovani === 'ZPRACOVAVA_SE'
  );

  const nacistStav = useCallback(async () => {
    const vysledek = await nacist<{ obrazky: AdminFotka[] }>(
      `/api/admin/obrazky?produkt=${encodeURIComponent(productId)}`
    );
    if (vysledek.ok) setFotky(vysledek.data.obrazky);
  }, [productId]);

  // Ptáme se jen dokud něco čeká – jakmile je vše hotové, polling se zastaví
  // a administrace zbytečně nebuší na server.
  useEffect(() => {
    if (!cekaNaZpracovani) return;

    casovac.current = setTimeout(() => void nacistStav(), INTERVAL_MS);
    return () => {
      if (casovac.current) clearTimeout(casovac.current);
    };
  }, [cekaNaZpracovani, fotky, nacistStav]);

  const nahratFotky = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vybrane = e.target.files;
    if (!vybrane || vybrane.length === 0) return;

    setNahravam(true);
    setChyba(null);

    const data = new FormData();
    data.append('productId', productId);
    for (const soubor of Array.from(vybrane)) data.append('fotky', soubor);

    const vysledek = await poslatFormData<{ odmitnute: Array<{ nazev: string; duvod: string }> }>(
      '/api/admin/upload',
      data
    );

    if (vysledek.ok) {
      if (vysledek.data.odmitnute.length > 0) {
        setChyba(vysledek.data.odmitnute.map((o) => `${o.nazev}: ${o.duvod}`).join(' '));
      }
      await nacistStav();
    } else {
      setChyba(vysledek.chyba);
    }

    setNahravam(false);
    e.target.value = '';
  };

  const nastavitHlavni = async (id: string) => {
    // Optimisticky – přepnutí hlavní fotky je drobnost, čekat na server by rušilo.
    setFotky((p) => p.map((f) => ({ ...f, jeHlavni: f.id === id })));

    const vysledek = await poslatJson(`/api/admin/obrazky/${id}`, { jeHlavni: true }, 'PATCH');
    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      await nacistStav();
    }
  };

  const smazatFotku = async (id: string) => {
    if (!window.confirm('Opravdu smazat tuto fotku? Akce je nevratná.')) return;

    const vysledek = await poslatJson(`/api/admin/obrazky/${id}`, undefined, 'DELETE');
    if (vysledek.ok) {
      setFotky((p) => p.filter((f) => f.id !== id));
    } else {
      setChyba(vysledek.chyba);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-linda-espresso">Fotografie</h2>
        {cekaNaZpracovani && (
          <span
            role="status"
            className="flex items-center gap-1.5 rounded-full bg-linda-sandLight px-3 py-1 text-[10px] font-semibold text-linda-espresso shadow-neuInsetSm"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Worker zpracovává fotky…
          </span>
        )}
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

      <div className="space-y-2 rounded-2xl border-2 border-dashed border-linda-sand p-6 text-center">
        {nahravam ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-linda-cognac" aria-hidden="true" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
        )}
        <div className="text-xs">
          <label className="cursor-pointer font-semibold text-linda-cognac hover:underline">
            {nahravam ? 'Nahrávám…' : 'Přidat další fotky'}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={nahravam}
              onChange={nahratFotky}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-[10px] text-linda-espresso/70">
          Zmenšení a převod do WebP běží na pozadí – nemusíte na něj čekat.
        </p>
      </div>

      {fotky.length === 0 ? (
        <p className="rounded-xl bg-linda-sandLight p-4 text-center text-xs text-linda-espresso/75 shadow-neuInsetSm">
          Zatím tu není žádná fotka. Do té doby se produkt zobrazí s grafickým zástupným symbolem.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {fotky.map((fotka) => (
            <li key={fotka.id} className="space-y-2 rounded-xl bg-linda-cream p-3 shadow-neuSm">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-linda-sandLight shadow-neuInsetSm">
                {fotka.stavZpracovani === 'HOTOVO' && fotka.urlMedium ? (
                  <Image
                    src={fotka.urlMedium}
                    alt={fotka.altText ?? 'Fotografie produktu'}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                    {fotka.stavZpracovani === 'CHYBA' ? (
                      <>
                        <AlertCircle className="h-6 w-6 text-red-800" aria-hidden="true" />
                        <span className="text-[10px] font-semibold text-red-800">
                          Zpracování selhalo – nahrajte fotku znovu
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-linda-cognac" aria-hidden="true" />
                        <span className="text-[10px] font-medium text-linda-espresso/75">
                          {fotka.stavZpracovani === 'CEKA' ? 'Čeká ve frontě' : 'Komprese Sharpem…'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {fotka.chybaDuvod && (
                <p className="text-[10px] text-red-800" title={fotka.chybaDuvod}>
                  {fotka.chybaDuvod.slice(0, 80)}
                </p>
              )}

              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => void nastavitHlavni(fotka.id)}
                  disabled={fotka.jeHlavni || fotka.stavZpracovani !== 'HOTOVO'}
                  aria-label={fotka.jeHlavni ? 'Toto je hlavní fotka' : 'Nastavit jako hlavní fotku'}
                  className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg text-[10px] font-semibold text-linda-espresso transition-all duration-200 disabled:cursor-default"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${fotka.jeHlavni ? 'fill-linda-cognac text-linda-cognac' : 'text-linda-espresso/60'}`}
                    aria-hidden="true"
                  />
                  {fotka.jeHlavni ? 'Hlavní' : 'Nastavit hlavní'}
                </button>

                {fotka.stavZpracovani === 'HOTOVO' && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold text-linda-sage"
                    title={fotka.sirka && fotka.vyska ? `${fotka.sirka} × ${fotka.vyska} px` : undefined}
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    WebP
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => void smazatFotku(fotka.id)}
                  aria-label="Smazat fotku"
                  className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
