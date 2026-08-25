'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Gift, Loader2, Plus, Search } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { formatDatum } from '@/lib/objednavka-popisky';

/**
 * Dárkové poukazy.
 *
 * Do téhle chvíle se poukazy z administrace ovládat nedaly vůbec. Vznikaly
 * jedině ve workeru po zaplacení objednávky a tím to skončilo – majitelka
 * neviděla zůstatky, nemohla poukaz vystavit ručně (kompenzace k reklamaci)
 * ani zneplatnit ztracený kód, na který se zákaznice ptala telefonem.
 *
 * Zůstatek se tu **needituje**. Mění ho jen objednávka a storno, obojí
 * v transakci s podmínkou uvnitř `UPDATE`; ruční přepis by tu kontrolu obešel.
 * Mazání tu taky není: vyčerpaný poukaz je stopa po zaplacené objednávce.
 */

interface Poukaz {
  id: string;
  kod: string;
  castka: number;
  zustatek: number;
  platnyDo: string | null;
  aktivni: boolean;
  createdAt: string;
  zObjednavky: { id: string; cisloObjednavky: string } | null;
  pocetPouziti: number;
}

const POLE =
  'w-full bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 text-xs text-linda-espresso disabled:opacity-60';

export default function AdminPoukazyPage() {
  const [poukazy, setPoukazy] = useState<Poukaz[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});
  const [pracuje, setPracuje] = useState(false);
  const [hledat, setHledat] = useState('');

  /** Kód posledního vystaveného poukazu – majitelka ho potřebuje opsat. */
  const [vystaveny, setVystaveny] = useState<string | null>(null);

  const [form, setForm] = useState({ castka: '500', platnyDo: '', duvod: '' });

  const nacistPoukazy = useCallback(async (dotaz: string) => {
    const adresa = dotaz.trim()
      ? `/api/admin/poukazy?hledat=${encodeURIComponent(dotaz.trim())}`
      : '/api/admin/poukazy';

    const vysledek = await nacist<{ poukazy: Poukaz[] }>(adresa);

    if (vysledek.ok) setPoukazy(vysledek.data.poukazy);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistPoukazy('');
  }, [nacistPoukazy]);

  const vytvorit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pracuje) return;

    setPracuje(true);
    setChyba(null);
    setChybyPoli({});
    setVystaveny(null);

    const vysledek = await poslatJson<{ poukaz: Poukaz }>('/api/admin/poukazy', {
      castka: form.castka,
      platnyDo: form.platnyDo || null,
      duvod: form.duvod || null,
    });

    if (vysledek.ok) {
      setVystaveny(vysledek.data.poukaz.kod);
      setForm({ castka: '500', platnyDo: '', duvod: '' });
      await nacistPoukazy(hledat);
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setPracuje(false);
  };

  const prepnout = async (poukaz: Poukaz) => {
    setChyba(null);

    const vysledek = await poslatJson(
      `/api/admin/poukazy/${poukaz.id}`,
      { aktivni: !poukaz.aktivni },
      'PATCH'
    );

    if (vysledek.ok) await nacistPoukazy(hledat);
    else setChyba(vysledek.chyba);
  };

  const hledatOdeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    setNacitam(true);
    await nacistPoukazy(hledat);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl text-linda-espresso sm:text-4xl">Dárkové poukazy</h1>
        <p className="mt-1 text-xs text-linda-espresso/70">
          Poukazy koupené jako zboží se vydávají samy po zaplacení. Tady je vidíte a můžete
          vystavit další ručně.
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

      {/* Vypíchnutí čerstvě vystaveného kódu, ať ho majitelka nemusí hledat
          v seznamu. Poukaz koupený jako zboží posílá zákaznici e-mail;
          ručně vystavený jí musí předat sama. */}
      {vystaveny && (
        <div
          role="status"
          className="space-y-2 rounded-2xl bg-linda-sageLight p-5 text-center shadow-neuInsetSm"
        >
          <p className="text-xs font-semibold text-linda-sage">Poukaz vystaven</p>
          <p className="font-mono text-xl font-bold tracking-[0.2em] text-linda-espresso">
            {vystaveny}
          </p>
          <p className="text-[11px] text-linda-espresso/75">
            Předejte ho zákaznici – e-mail se u ručně vystaveného poukazu neposílá.
          </p>
        </div>
      )}

      <form onSubmit={vytvorit} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <h2 className="font-serif text-xl text-linda-espresso">Vystavit poukaz</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="castka" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Částka (Kč) *
            </label>
            <input
              id="castka"
              type="number"
              min="1"
              step="1"
              required
              value={form.castka}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, castka: e.target.value })}
              className={POLE}
            />
            {chybyPoli.castka && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
                {chybyPoli.castka}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="platnyDo"
              className="mb-1 block text-xs font-semibold text-linda-espresso"
            >
              Platnost do
            </label>
            <input
              id="platnyDo"
              type="date"
              value={form.platnyDo}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, platnyDo: e.target.value })}
              placeholder="bez omezení"
              className={POLE}
            />
          </div>

          <div>
            <label htmlFor="duvod" className="mb-1 block text-xs font-semibold text-linda-espresso">
              Důvod (jen do záznamů)
            </label>
            <input
              id="duvod"
              type="text"
              maxLength={200}
              value={form.duvod}
              disabled={pracuje}
              onChange={(e) => setForm({ ...form, duvod: e.target.value })}
              placeholder="např. kompenzace reklamace"
              className={POLE}
            />
          </div>
        </div>

        <p className="text-[11px] text-linda-espresso/70">
          Kód generuje server náhodně – u platidla by se vlastní heslo dalo uhodnout a utratit.
        </p>

        <button
          type="submit"
          disabled={pracuje}
          aria-busy={pracuje}
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:opacity-70"
        >
          {pracuje ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Vystavuji…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Vystavit poukaz
            </>
          )}
        </button>
      </form>

      {/* Hledání podle kódu – typicky když zákaznice volá „nefunguje mi tenhle". */}
      <form onSubmit={hledatOdeslat} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="hledat" className="mb-1 block text-xs font-semibold text-linda-espresso">
            Najít podle kódu
          </label>
          <input
            id="hledat"
            type="search"
            value={hledat}
            onChange={(e) => setHledat(e.target.value.toUpperCase())}
            placeholder="část kódu stačí"
            className={`${POLE} uppercase placeholder:normal-case`}
          />
        </div>

        <button
          type="submit"
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Hledat
        </button>
      </form>

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-linda-cream p-10 text-xs text-linda-espresso/75 shadow-neu">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám…
        </p>
      ) : poukazy.length === 0 ? (
        <div className="space-y-2 rounded-2xl bg-linda-cream p-10 text-center shadow-neu">
          <Gift className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/75">
            {hledat.trim() ? 'Žádný poukaz tomuhle kódu neodpovídá.' : 'Zatím žádný poukaz.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {poukazy.map((p) => {
            const vycerpany = p.zustatek <= 0;
            const prosly = p.platnyDo !== null && new Date(p.platnyDo) < new Date();
            const castecne = p.zustatek > 0 && p.zustatek < p.castka;

            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-linda-cream p-4 shadow-neuSm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-wider text-linda-espresso">
                    {p.kod}
                  </p>
                  <p className="text-[11px] text-linda-espresso/70">
                    {p.castka.toLocaleString('cs-CZ')} Kč
                    {castecne && ` · zbývá ${p.zustatek.toLocaleString('cs-CZ')} Kč`}
                    {p.platnyDo && ` · do ${formatDatum(new Date(p.platnyDo))}`}
                    {p.zObjednavky ? (
                      <>
                        {' · z objednávky '}
                        <Link
                          href={`/admin/objednavky/${p.zObjednavky.id}`}
                          className="font-semibold text-linda-cognac underline"
                        >
                          {p.zObjednavky.cisloObjednavky}
                        </Link>
                      </>
                    ) : (
                      ' · vystaven ručně'
                    )}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    !p.aktivni || vycerpany || prosly
                      ? 'bg-linda-sandLight text-linda-espresso/75 shadow-neuInsetSm'
                      : 'bg-linda-sageLight text-linda-sage'
                  }`}
                >
                  {vycerpany ? 'Vyčerpaný' : !p.aktivni ? 'Vypnutý' : prosly ? 'Prošlý' : 'Aktivní'}
                </span>

                {/* Vyčerpaný poukaz nejde zapnout – jen by v pokladně sliboval
                    peníze, které na něm nejsou. */}
                {!vycerpany && (
                  <button
                    type="button"
                    onClick={() => void prepnout(p)}
                    className="min-h-touch shrink-0 cursor-pointer rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
                  >
                    {p.aktivni ? 'Zneplatnit' : 'Zapnout'}
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
