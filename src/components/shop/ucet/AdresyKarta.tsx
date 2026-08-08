'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { Hlaska, PoleFormulare } from '@/components/ui/PoleFormulare';

interface Adresa {
  id: string;
  jmenoPrijmeni: string;
  ulice: string;
  mesto: string;
  psc: string;
  zeme: string;
  telefon: string | null;
  typ: 'DODACI' | 'FAKTURACNI';
  jeVychozi: boolean;
}

type Formular = Omit<Adresa, 'id'>;

const PRAZDNY: Formular = {
  jmenoPrijmeni: '',
  ulice: '',
  mesto: '',
  psc: '',
  zeme: 'CZ',
  telefon: '',
  typ: 'DODACI',
  jeVychozi: false,
};

const NAZEV_TYPU: Record<Adresa['typ'], string> = {
  DODACI: 'Doručovací',
  FAKTURACNI: 'Fakturační',
};

/**
 * Uložené adresy.
 *
 * Model `Address` v databázi byl od začátku a administrace adresy zobrazovala,
 * jenže zákaznice neměla jak nějakou založit – pokladna se proto ptala na
 * doručovací údaje při každém nákupu znovu.
 */
export function AdresyKarta() {
  const [adresy, setAdresy] = useState<Adresa[]>([]);
  const [nacitam, setNacitam] = useState(true);

  /** `null` = zavřeno, `'nova'` = zakládání, jinak id upravované adresy. */
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [form, setForm] = useState<Formular>(PRAZDNY);

  const [uklada, setUklada] = useState(false);
  const [mazeId, setMazeId] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [poleChyby, setPoleChyby] = useState<Record<string, string>>({});

  const nacistAdresy = useCallback(async () => {
    const vysledek = await nacist<{ adresy: Adresa[] }>('/api/ucet/adresy');

    if (vysledek.ok) setAdresy(vysledek.data.adresy);
    else setChyba(vysledek.chyba);

    setNacitam(false);
  }, []);

  useEffect(() => {
    void nacistAdresy();
  }, [nacistAdresy]);

  const zavrit = () => {
    setOtevreno(null);
    setForm(PRAZDNY);
    setPoleChyby({});
  };

  const otevritNovou = () => {
    setForm(PRAZDNY);
    setPoleChyby({});
    setChyba(null);
    setHlaska(null);
    setOtevreno('nova');
  };

  const otevritUpravu = (adresa: Adresa) => {
    const { id: _id, ...zbytek } = adresa;
    setForm({ ...zbytek, telefon: zbytek.telefon ?? '' });
    setPoleChyby({});
    setChyba(null);
    setHlaska(null);
    setOtevreno(adresa.id);
  };

  const ulozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uklada || otevreno === null) return;

    setUklada(true);
    setChyba(null);
    setHlaska(null);
    setPoleChyby({});

    const telo = { ...form, telefon: form.telefon?.trim() || null };

    const vysledek =
      otevreno === 'nova'
        ? await poslatJson<{ adresy: Adresa[] }>('/api/ucet/adresy', telo)
        : await poslatJson<{ adresy: Adresa[] }>(`/api/ucet/adresy/${otevreno}`, telo, 'PATCH');

    if (vysledek.ok) {
      setAdresy(vysledek.data.adresy);
      setHlaska(otevreno === 'nova' ? 'Adresu jsme uložili.' : 'Změny jsme uložili.');
      zavrit();
    } else {
      setChyba(vysledek.chyba);
      setPoleChyby(vysledek.pole ?? {});
    }

    setUklada(false);
  };

  const smazat = async (adresa: Adresa) => {
    if (!window.confirm(`Opravdu smazat adresu ${adresa.ulice}, ${adresa.mesto}?`)) return;

    setMazeId(adresa.id);
    setChyba(null);
    setHlaska(null);

    const vysledek = await poslatJson<{ adresy: Adresa[] }>(
      `/api/ucet/adresy/${adresa.id}`,
      undefined,
      'DELETE'
    );

    if (vysledek.ok) {
      setAdresy(vysledek.data.adresy);
      setHlaska('Adresu jsme smazali.');
    } else {
      setChyba(vysledek.chyba);
    }

    setMazeId(null);
  };

  const nastavitVychozi = async (adresa: Adresa) => {
    setUklada(true);
    setChyba(null);
    setHlaska(null);

    const vysledek = await poslatJson<{ adresy: Adresa[] }>(
      `/api/ucet/adresy/${adresa.id}`,
      { ...adresa, telefon: adresa.telefon || null, jeVychozi: true },
      'PATCH'
    );

    if (vysledek.ok) {
      setAdresy(vysledek.data.adresy);
      setHlaska('Adresu jsme nastavili jako výchozí.');
    } else {
      setChyba(vysledek.chyba);
    }

    setUklada(false);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <MapPin className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Uložené adresy
        </h2>

        {otevreno === null && (
          <button
            type="button"
            onClick={otevritNovou}
            className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm"
          >
            <Plus className="h-3.5 w-3.5 text-linda-cognac" aria-hidden="true" />
            Přidat adresu
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-linda-espresso/85">
        Výchozí adresu vám v pokladně předvyplníme. Už odeslané objednávky se pozdější úpravou
        adresy nezmění – nesou vlastní kopii toho, kam zboží doopravdy šlo.
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
      {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

      {otevreno !== null && (
        <form
          onSubmit={ulozit}
          className="animate-fadeInUp space-y-4 rounded-xl bg-linda-sandLight p-5 shadow-neuInsetSm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-linda-espresso/75">
              {otevreno === 'nova' ? 'Nová adresa' : 'Úprava adresy'}
            </h3>

            <button
              type="button"
              onClick={zavrit}
              disabled={uklada}
              aria-label="Zavřít formulář"
              className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full text-linda-espresso/70 transition-colors duration-200 hover:text-linda-cognac disabled:opacity-60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/*
            Formulář sedí v prohlubni, takže jeho vlastní pole už zapuštěná být
            nemůžou – prohlubeň v prohlubni nemá v rozpočtu ploch kam jít.
            Mezi ně proto patří vyvýšená krémová karta: zem → vyvýšené → zapuštěné.
          */}
          <div className="space-y-4 rounded-xl bg-linda-cream p-4 shadow-neuSm">
            <PoleFormulare
              id="adresa-jmeno"
              label="Jméno a příjmení"
              required
              value={form.jmenoPrijmeni}
              onChange={(v) => setForm({ ...form, jmenoPrijmeni: v })}
              autoComplete="name"
              disabled={uklada}
              chyba={poleChyby.jmenoPrijmeni}
            />

            <PoleFormulare
              id="adresa-ulice"
              label="Ulice a číslo popisné"
              required
              value={form.ulice}
              onChange={(v) => setForm({ ...form, ulice: v })}
              autoComplete="street-address"
              disabled={uklada}
              chyba={poleChyby.ulice}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <PoleFormulare
                id="adresa-mesto"
                label="Město"
                required
                value={form.mesto}
                onChange={(v) => setForm({ ...form, mesto: v })}
                autoComplete="address-level2"
                disabled={uklada}
                chyba={poleChyby.mesto}
              />

              <PoleFormulare
                id="adresa-psc"
                label="PSČ"
                required
                inputMode="numeric"
                value={form.psc}
                onChange={(v) => setForm({ ...form, psc: v })}
                autoComplete="postal-code"
                maxLength={6}
                disabled={uklada}
                chyba={poleChyby.psc}
              />
            </div>

            <PoleFormulare
              id="adresa-telefon"
              label="Telefon"
              type="tel"
              inputMode="tel"
              value={form.telefon ?? ''}
              onChange={(v) => setForm({ ...form, telefon: v })}
              autoComplete="tel"
              disabled={uklada}
              chyba={poleChyby.telefon}
              napoveda="Dopravce na něj hlásí doručení."
            />

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-linda-espresso">
                K čemu adresa slouží
              </legend>

              <div className="flex flex-wrap gap-2">
                {(['DODACI', 'FAKTURACNI'] as const).map((typ) => {
                  const vybrano = form.typ === typ;

                  return (
                    <label
                      key={typ}
                      className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-full px-5 text-xs font-semibold transition-all duration-200 ${
                        vybrano
                          ? 'bg-linda-sandLight text-linda-espresso shadow-neuInsetSm'
                          : 'bg-linda-cream text-linda-espresso/80 shadow-neuSm hover:shadow-neu'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adresa-typ"
                        value={typ}
                        checked={vybrano}
                        disabled={uklada}
                        onChange={() => setForm({ ...form, typ })}
                        className="h-3.5 w-3.5 cursor-pointer accent-linda-cognac"
                      />
                      {NAZEV_TYPU[typ]}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label
              htmlFor="adresa-vychozi"
              className="flex cursor-pointer items-center gap-3 text-xs text-linda-espresso"
            >
              <input
                id="adresa-vychozi"
                type="checkbox"
                checked={form.jeVychozi}
                disabled={uklada}
                onChange={(e) => setForm({ ...form, jeVychozi: e.target.checked })}
                className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac disabled:cursor-not-allowed"
              />
              Používat jako výchozí pro tento typ adresy
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={uklada}
              aria-busy={uklada}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uklada ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Ukládám…
                </>
              ) : (
                'Uložit adresu'
              )}
            </button>

            <button
              type="button"
              onClick={zavrit}
              disabled={uklada}
              className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {nacitam ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-linda-sandLight p-8 text-xs text-linda-espresso/75 shadow-neuInsetSm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Načítám adresy…
        </p>
      ) : adresy.length === 0 ? (
        otevreno === null && (
          <div className="space-y-3 rounded-xl bg-linda-sandLight p-8 text-center shadow-neuInsetSm">
            <MapPin className="mx-auto h-7 w-7 text-linda-cognac opacity-60" aria-hidden="true" />
            <p className="text-xs text-linda-espresso/75">
              Zatím tu žádnou adresu nemáte. Uložená adresa vám příště ušetří vyplňování
              v pokladně.
            </p>
          </div>
        )
      ) : (
        <ul className="space-y-3">
          {adresy.map((adresa) => (
            <li
              key={adresa.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm"
            >
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-linda-espresso">
                  {adresa.jmenoPrijmeni}

                  <span className="rounded-full bg-linda-cream px-2.5 py-1 text-[10px] font-semibold text-linda-espresso/80 shadow-neuSm">
                    {NAZEV_TYPU[adresa.typ]}
                  </span>

                  {adresa.jeVychozi && (
                    <span className="flex items-center gap-1 rounded-full bg-linda-sageLight px-2.5 py-1 text-[10px] font-semibold text-linda-sage">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      Výchozí
                    </span>
                  )}
                </p>

                <p className="text-[11px] leading-relaxed text-linda-espresso/80">
                  {adresa.ulice}
                  <br />
                  {adresa.psc} {adresa.mesto}
                  {adresa.zeme !== 'CZ' && `, ${adresa.zeme}`}
                  {adresa.telefon && (
                    <>
                      <br />
                      {adresa.telefon}
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!adresa.jeVychozi && (
                  <button
                    type="button"
                    onClick={() => void nastavitVychozi(adresa)}
                    disabled={uklada || mazeId !== null}
                    aria-label={`Nastavit adresu ${adresa.ulice} jako výchozí`}
                    className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => otevritUpravu(adresa)}
                  disabled={uklada || mazeId !== null}
                  aria-label={`Upravit adresu ${adresa.ulice}`}
                  className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-linda-cognac hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => void smazat(adresa)}
                  disabled={uklada || mazeId !== null}
                  aria-label={`Smazat adresu ${adresa.ulice}`}
                  className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-red-800 shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60"
                >
                  {mazeId === adresa.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
