'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, Tag, Trash2 } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { formatDatum } from '@/lib/objednavka-popisky';

interface SlevovyKod {
  id: string;
  kod: string;
  procentoSlevy: number;
  platnyOd: string | null;
  platnyDo: string | null;
  limitPouziti: number | null;
  pocetPouziti: number;
  aktivni: boolean;
  pocetObjednavek: number;
}

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 text-xs text-linda-espresso disabled:opacity-60';

export default function AdminSlevoveKodyPage() {
  const [kody, setKody] = useState<SlevovyKod[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});
  const [pracuje, setPracuje] = useState(false);

  const [form, setForm] = useState({
    kod: '',
    procentoSlevy: '10',
    platnyDo: '',
    limitPouziti: '',
  });

  const nacistKody = useCallback(async () => {
    const vysledek = await nacist<{ kody: SlevovyKod[] }>('/api/admin/slevove-kody');

    if (vysledek.ok) setKody(vysledek.data.kody);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistKody();
  }, [nacistKody]);

  const vytvorit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pracuje) return;

    setPracuje(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson('/api/admin/slevove-kody', {
      // Prázdný kód = server ho vygeneruje sám (sekce 6.6).
      kod: form.kod || null,
      procentoSlevy: form.procentoSlevy,
      platnyDo: form.platnyDo || null,
      limitPouziti: form.limitPouziti || null,
    });

    if (vysledek.ok) {
      setForm({ kod: '', procentoSlevy: '10', platnyDo: '', limitPouziti: '' });
      await nacistKody();
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setPracuje(false);
  };

  const prepnout = async (kod: SlevovyKod) => {
    setChyba(null);
    const vysledek = await poslatJson(`/api/admin/slevove-kody/${kod.id}`, { aktivni: !kod.aktivni }, 'PATCH');

    if (vysledek.ok) await nacistKody();
    else setChyba(vysledek.chyba);
  };

  const smazat = async (kod: SlevovyKod) => {
    if (!window.confirm(`Opravdu smazat kód ${kod.kod}?`)) return;

    setChyba(null);
    const vysledek = await poslatJson(`/api/admin/slevove-kody/${kod.id}`, undefined, 'DELETE');

    if (vysledek.ok) await nacistKody();
    else setChyba(vysledek.chyba);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Slevové kódy</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Sleva se vždy počítá z aktuální prodejní ceny, tedy i ze zlevněné – slevy se nesčítají
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

      <form onSubmit={vytvorit} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Nový kód</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="kod" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Kód
            </label>
            <input
              id="kod"
              type="text"
              value={form.kod}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, kod: e.target.value.toUpperCase() })}
              placeholder="Nechte prázdné = vygenerujeme"
              className={`${POLE} uppercase placeholder:normal-case`}
            />
            {chybyPoli.kod && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
                {chybyPoli.kod}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="procento" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Sleva (%) *
            </label>
            <input
              id="procento"
              type="number"
              min="1"
              max="100"
              required
              value={form.procentoSlevy}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, procentoSlevy: e.target.value })}
              className={POLE}
            />
            {chybyPoli.procentoSlevy && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
                {chybyPoli.procentoSlevy}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="platnyDo" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Platnost do
            </label>
            <input
              id="platnyDo"
              type="date"
              value={form.platnyDo}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, platnyDo: e.target.value })}
              className={POLE}
            />
          </div>

          <div>
            <label htmlFor="limit" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Limit použití
            </label>
            <input
              id="limit"
              type="number"
              min="1"
              value={form.limitPouziti}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, limitPouziti: e.target.value })}
              placeholder="neomezeně"
              className={POLE}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pracuje}
          aria-busy={pracuje}
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:opacity-70"
        >
          {pracuje ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Vytvářím…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Vytvořit kód
            </>
          )}
        </button>
      </form>

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám…
        </p>
      ) : kody.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <Tag className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">Zatím žádný slevový kód.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {kody.map((k) => {
            const vycerpany = k.limitPouziti !== null && k.pocetPouziti >= k.limitPouziti;
            const prosly = k.platnyDo !== null && new Date(k.platnyDo) < new Date();

            return (
              <li key={k.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-wider text-linda-espresso">{k.kod}</p>
                  <p className="text-[11px] text-linda-espresso/70">
                    −{k.procentoSlevy} % · použito {k.pocetPouziti}
                    {k.limitPouziti !== null && ` z ${k.limitPouziti}`}
                    {k.platnyDo && ` · do ${formatDatum(new Date(k.platnyDo))}`}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    !k.aktivni || vycerpany || prosly
                      ? 'bg-linda-sandLight text-linda-espresso/75 shadow-neuInsetSm'
                      : 'bg-linda-sageLight text-linda-sage'
                  }`}
                >
                  {!k.aktivni ? 'Vypnutý' : vycerpany ? 'Vyčerpaný' : prosly ? 'Prošlý' : 'Aktivní'}
                </span>

                <button
                  type="button"
                  onClick={() => void prepnout(k)}
                  className="min-h-touch shrink-0 cursor-pointer rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                >
                  {k.aktivni ? 'Vypnout' : 'Zapnout'}
                </button>

                {k.pocetObjednavek === 0 && (
                  <button
                    type="button"
                    onClick={() => void smazat(k)}
                    aria-label={`Smazat kód ${k.kod}`}
                    className="flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-800 active:shadow-neuInsetSm"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
