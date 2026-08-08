'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, PackageOpen, RotateCcw } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { Hlaska, OblastFormulare } from '@/components/ui/PoleFormulare';
import { STAV_REKLAMACE, formatDatum } from '@/lib/objednavka-popisky';

export interface ObjednavkaProReklamaci {
  id: string;
  cisloObjednavky: string;
  lzeReklamovat: boolean;
  polozky: Array<{ id: string; nazev: string; velikost: string }>;
}

interface Reklamace {
  id: string;
  typ: 'REKLAMACE' | 'VRACENI';
  stav: string;
  duvod: string | null;
  poznamkaAdmina: string | null;
  datumPrijeti: string;
  datumVyrizeni: string | null;
  cisloObjednavky: string;
  polozka: string | null;
}

/** Celá objednávka se v `<select>` vybírá touhle hodnotou, ne prázdným řetězcem. */
const CELA_OBJEDNAVKA = 'cela';

const TRIDY_VYBERU =
  'min-h-touch w-full cursor-pointer rounded-xl bg-linda-cream px-4 text-xs text-linda-espresso shadow-neuSm transition-shadow hover:shadow-neu disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Reklamace a vrácení zboží.
 *
 * Do téhle chvíle uměla žádost založit **jen administrace** – zákaznice
 * neměla jak vrácení uplatnit jinak než e-mailem, přestože na odstoupení od
 * smlouvy do 14 dnů má ze zákona nárok.
 */
export function ReklamaceKarta({
  objednavky,
  objednavkyNacitaji,
}: {
  objednavky: ObjednavkaProReklamaci[];
  /** Objednávky se načítají v nadřazené komponentě – bez tohohle by prázdný
      seznam během načítání vypadal jako „nemáte co reklamovat". */
  objednavkyNacitaji: boolean;
}) {
  const zpusobile = objednavky.filter((o) => o.lzeReklamovat);

  const [reklamace, setReklamace] = useState<Reklamace[]>([]);
  const [nacitam, setNacitam] = useState(true);

  const [orderId, setOrderId] = useState('');
  const [orderItemId, setOrderItemId] = useState(CELA_OBJEDNAVKA);
  const [typ, setTyp] = useState<'REKLAMACE' | 'VRACENI'>('VRACENI');
  const [duvod, setDuvod] = useState('');

  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [poleChyby, setPoleChyby] = useState<Record<string, string>>({});

  const nacistReklamace = useCallback(async () => {
    const vysledek = await nacist<{ reklamace: Reklamace[] }>('/api/reklamace');

    if (vysledek.ok) setReklamace(vysledek.data.reklamace);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistReklamace();
  }, [nacistReklamace]);

  const vybrana = zpusobile.find((o) => o.id === orderId) ?? null;

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);
    setHlaska(null);
    setPoleChyby({});

    const vysledek = await poslatJson<{ zprava: string }>('/api/reklamace', {
      orderId,
      orderItemId: orderItemId === CELA_OBJEDNAVKA ? null : orderItemId,
      typ,
      duvod,
    });

    if (vysledek.ok) {
      setHlaska(vysledek.data.zprava);
      setDuvod('');
      setOrderId('');
      setOrderItemId(CELA_OBJEDNAVKA);
      await nacistReklamace();
    } else {
      setChyba(vysledek.chyba);
      setPoleChyby(vysledek.pole ?? {});
    }

    setOdesila(false);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <RotateCcw className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Vrácení a reklamace
        </h2>

        <p className="text-xs leading-relaxed text-linda-espresso/85">
          Zboží můžete vrátit bez udání důvodu do 14 dnů od převzetí. Reklamovat vadu jde po celou
          dobu záruky. Žádost tady jen podáte – ozveme se vám s pokyny, kam zásilku poslat.
        </p>

        {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
        {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

        {objednavkyNacitaji ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-linda-sandLight p-6 text-xs text-linda-espresso/75 shadow-neuInsetSm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Načítám vaše objednávky…
          </p>
        ) : zpusobile.length === 0 ? (
          <div className="space-y-2 rounded-xl bg-linda-sandLight p-6 text-center shadow-neuInsetSm">
            <PackageOpen className="mx-auto h-7 w-7 text-linda-cognac opacity-60" aria-hidden="true" />
            <p className="text-xs text-linda-espresso/75">
              Zatím tu není objednávka, ke které by šlo žádost podat. Formulář se otevře, jakmile
              zásilka odejde.
            </p>
          </div>
        ) : (
          <form onSubmit={odeslat} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reklamace-objednavka"
                  className="mb-1 block text-xs font-semibold text-linda-espresso"
                >
                  Objednávka
                </label>
                <select
                  id="reklamace-objednavka"
                  required
                  value={orderId}
                  disabled={odesila}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    setOrderItemId(CELA_OBJEDNAVKA);
                  }}
                  aria-invalid={poleChyby.orderId ? true : undefined}
                  className={TRIDY_VYBERU}
                >
                  <option value="">Vyberte objednávku…</option>
                  {zpusobile.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.cisloObjednavky}
                    </option>
                  ))}
                </select>
                {poleChyby.orderId && (
                  <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
                    {poleChyby.orderId}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reklamace-polozka"
                  className="mb-1 block text-xs font-semibold text-linda-espresso"
                >
                  Čeho se týká
                </label>
                <select
                  id="reklamace-polozka"
                  value={orderItemId}
                  disabled={odesila || vybrana === null}
                  onChange={(e) => setOrderItemId(e.target.value)}
                  aria-describedby="reklamace-polozka-napoveda"
                  className={TRIDY_VYBERU}
                >
                  <option value={CELA_OBJEDNAVKA}>Celá objednávka</option>
                  {vybrana?.polozky.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nazev} · {p.velikost}
                    </option>
                  ))}
                </select>
                <p
                  id="reklamace-polozka-napoveda"
                  className="mt-1.5 text-[11px] text-linda-espresso/70"
                >
                  {vybrana ? 'Vracíte-li jen jeden kus, vyberte ho tady.' : 'Nejdřív vyberte objednávku.'}
                </p>
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-linda-espresso">
                O co jde
              </legend>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { hodnota: 'VRACENI', popis: 'Vrácení do 14 dnů' },
                    { hodnota: 'REKLAMACE', popis: 'Reklamace vady' },
                  ] as const
                ).map((volba) => {
                  const vybrano = typ === volba.hodnota;

                  return (
                    <label
                      key={volba.hodnota}
                      className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-full px-5 text-xs font-semibold transition-all duration-200 ${
                        vybrano
                          ? 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm'
                          : 'bg-linda-cream text-linda-espresso/80 shadow-neuSm hover:shadow-neu'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reklamace-typ"
                        value={volba.hodnota}
                        checked={vybrano}
                        disabled={odesila}
                        onChange={() => setTyp(volba.hodnota)}
                        className="h-3.5 w-3.5 cursor-pointer accent-linda-cognac"
                      />
                      {volba.popis}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <OblastFormulare
              id="reklamace-duvod"
              label={typ === 'VRACENI' ? 'Důvod vrácení' : 'Popis vady'}
              required
              value={duvod}
              onChange={setDuvod}
              disabled={odesila}
              maxLength={2000}
              chyba={poleChyby.duvod}
              placeholder={
                typ === 'VRACENI'
                  ? 'Např. velikost nesedí, střih mi nepadne…'
                  : 'Např. po prvním praní se rozpáral šev v pase.'
              }
              napoveda="Čím konkrétnější popis, tím rychleji to vyřídíme."
            />

            <button
              type="submit"
              disabled={odesila || !orderId}
              aria-busy={odesila}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {odesila ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Odesílám…
                </>
              ) : (
                'Odeslat žádost'
              )}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <h2 className="font-serif text-xl text-linda-espresso">Podané žádosti</h2>

        {nacitam ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-linda-sandLight p-8 text-xs text-linda-espresso/75 shadow-neuInsetSm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Načítám…
          </p>
        ) : reklamace.length === 0 ? (
          <p className="rounded-xl bg-linda-sandLight p-6 text-center text-xs text-linda-espresso/75 shadow-neuInsetSm">
            Zatím jste žádnou žádost nepodala.
          </p>
        ) : (
          <ul className="space-y-3">
            {reklamace.map((r) => {
              const popis = STAV_REKLAMACE[r.stav] ?? {
                text: r.stav,
                tridy: 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm',
              };

              return (
                <li key={r.id} className="space-y-2 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-linda-espresso">
                        {r.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'} · {r.cisloObjednavky}
                      </p>
                      <p className="text-[11px] text-linda-espresso/70">
                        Podáno {formatDatum(new Date(r.datumPrijeti))}
                        {r.polozka && ` · ${r.polozka}`}
                        {r.datumVyrizeni && ` · vyřízeno ${formatDatum(new Date(r.datumVyrizeni))}`}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${popis.tridy}`}
                    >
                      {popis.text}
                    </span>
                  </div>

                  {r.duvod && (
                    <p className="text-[11px] leading-relaxed text-linda-espresso/85">{r.duvod}</p>
                  )}

                  {r.poznamkaAdmina && (
                    <p className="rounded-lg bg-linda-cream p-3 text-[11px] leading-relaxed text-linda-espresso shadow-neuSm">
                      <span className="font-semibold">Naše vyjádření: </span>
                      {r.poznamkaAdmina}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
