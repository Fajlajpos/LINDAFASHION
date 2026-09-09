'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarClock, Loader2, PackageSearch, Search } from 'lucide-react';
import { nacist } from '@/lib/api-klient';
import { STAV_REKLAMACE, formatDatum } from '@/lib/objednavka-popisky';
import { DNU_NA_REKLAMACI } from '@/lib/lhuty';

interface Zadost {
  typ: 'REKLAMACE' | 'VRACENI';
  stav: string;
  duvod: string | null;
  poznamkaAdmina: string | null;
  datumPrijeti: string;
  datumVyrizeni: string | null;
  lhutaDo: string | null;
  polozka: string | null;
}

interface Odpoved {
  nalezeno: boolean;
  zprava?: string;
  cisloObjednavky?: string;
  zadosti?: Zadost[];
}

const POLE =
  'min-h-touch w-full rounded-xl bg-linda-sandLight px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60 disabled:opacity-60';

/** Je žádost už uzavřená? Podle toho se lhůta buď počítá, nebo jen konstatuje. */
function jeVyrizena(stav: string): boolean {
  return stav === 'VYRIZENA_UZNANA' || stav === 'VYRIZENA_ZAMITNUTA';
}

/**
 * Stav reklamace nebo vrácení pro **nepřihlášenou** zákaznici.
 *
 * Dvě cesty dovnitř, obě přes tentýž endpoint:
 *
 *  • odkaz s `?t=` z e-mailu – načte se hned při otevření stránky;
 *  • číslo objednávky + e-mail – tatáž dvojice jako u reklamačního formuláře.
 *
 * Ta druhá je tu schválně: kdyby stav šel zjistit jen z odkazu v e-mailu,
 * byla by celá stránka závislá na nastaveném SMTP a zákaznici, které se
 * e-mail ztratil, by nepomohla vůbec.
 */
export function StavReklamace({ token }: { token?: string | null }) {
  const [cislo, setCislo] = useState('');
  const [email, setEmail] = useState('');
  const [nacita, setNacita] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [vysledek, setVysledek] = useState<Odpoved | null>(null);

  const nacistStav = useCallback(async (dotaz: string) => {
    setNacita(true);
    setChyba(null);

    const odpoved = await nacist<Odpoved>(`/api/reklamace/stav?${dotaz}`);

    if (odpoved.ok) setVysledek(odpoved.data);
    else setChyba(odpoved.chyba);

    setNacita(false);
  }, []);

  /* Odkaz z e-mailu se načte sám – jinak by zákaznice po kliknutí koukala na
     prázdný formulář a musela vyplňovat něco, co už v adrese je. */
  useEffect(() => {
    if (token) void nacistStav(`token=${encodeURIComponent(token)}`);
  }, [token, nacistStav]);

  const hledat = (e: React.FormEvent) => {
    e.preventDefault();
    if (nacita) return;
    void nacistStav(
      `cisloObjednavky=${encodeURIComponent(cislo.trim())}&email=${encodeURIComponent(email.trim())}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Formulář se skryje jen tehdy, když se stav načetl z odkazu – jinak
          zákaznice potřebuje mít čím hledat dál. */}
      {!token && (
        <form
          onSubmit={hledat}
          className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu"
          aria-labelledby="stav-nadpis"
        >
          <h2 id="stav-nadpis" className="font-serif text-xl text-linda-espresso">
            Zadejte údaje z objednávky
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="stav-cislo"
                className="mb-1 block text-xs font-semibold text-linda-espresso"
              >
                Číslo objednávky *
              </label>
              <input
                id="stav-cislo"
                type="text"
                required
                value={cislo}
                onChange={(e) => setCislo(e.target.value)}
                placeholder="2026-00042"
                disabled={nacita}
                className={POLE}
              />
            </div>

            <div>
              <label
                htmlFor="stav-email"
                className="mb-1 block text-xs font-semibold text-linda-espresso"
              >
                E-mail z objednávky *
              </label>
              <input
                id="stav-email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                disabled={nacita}
                className={POLE}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={nacita}
            aria-busy={nacita}
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {nacita ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Zobrazit stav
          </button>
        </form>
      )}

      {nacita && token && (
        <p className="flex items-center gap-2 text-xs text-linda-espresso/75">
          <Loader2 className="h-4 w-4 animate-spin text-linda-cognac" aria-hidden="true" />
          Načítám stav žádosti…
        </p>
      )}

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      {vysledek && !vysledek.nalezeno && (
        <div
          role="status"
          className="space-y-3 rounded-2xl bg-linda-cream p-6 text-center shadow-neu"
        >
          <PackageSearch className="mx-auto h-8 w-8 text-linda-cognac opacity-60" aria-hidden="true" />
          <p className="text-xs text-linda-espresso/85">{vysledek.zprava}</p>
          <Link
            href="/reklamace"
            className="inline-flex min-h-touch items-center text-xs font-semibold text-linda-cognac underline"
          >
            Podat novou reklamaci
          </Link>
        </div>
      )}

      {vysledek?.nalezeno && vysledek.zadosti && (
        <div role="status" className="space-y-4">
          <p className="text-xs text-linda-espresso/75">
            Objednávka <strong className="text-linda-espresso">{vysledek.cisloObjednavky}</strong> –{' '}
            {vysledek.zadosti.length === 1
              ? 'jedna žádost'
              : `${vysledek.zadosti.length} žádosti`}
          </p>

          <ul className="space-y-4">
            {vysledek.zadosti.map((z, i) => {
              const popis = STAV_REKLAMACE[z.stav] ?? { text: z.stav, tridy: 'bg-linda-sandLight' };
              const nazev = z.typ === 'VRACENI' ? 'Vrácení zboží' : 'Reklamace';
              const konec = z.lhutaDo ? new Date(z.lhutaDo) : null;

              return (
                <li key={i} className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg text-linda-espresso">{nazev}</h3>
                      {z.polozka && (
                        <p className="text-[11px] text-linda-espresso/70">{z.polozka}</p>
                      )}
                    </div>

                    {/* Stav nese slovo, ne jen barvu – barevný, ale nepřečtený
                        štítek je k ničemu. */}
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${popis.tridy}`}
                    >
                      {popis.text}
                    </span>
                  </div>

                  <dl className="space-y-1.5 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-linda-espresso/70">Přijato</dt>
                      <dd className="font-semibold text-linda-espresso">
                        {formatDatum(new Date(z.datumPrijeti))}
                      </dd>
                    </div>

                    {z.datumVyrizeni && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-linda-espresso/70">Vyřízeno</dt>
                        <dd className="font-semibold text-linda-espresso">
                          {formatDatum(new Date(z.datumVyrizeni))}
                        </dd>
                      </div>
                    )}

                    {/* Zákonná lhůta se ukazuje i po vyřízení, ale jinou větou:
                        u uzavřené žádosti je to už jen údaj, ne odpočet. */}
                    {konec && !jeVyrizena(z.stav) && (
                      <div className="flex justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-linda-espresso/70">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Vyřídíme nejpozději do
                        </dt>
                        <dd className="font-semibold text-linda-espresso">{formatDatum(konec)}</dd>
                      </div>
                    )}
                  </dl>

                  {z.duvod && (
                    <p className="text-xs text-linda-espresso/85">
                      <strong className="font-semibold">Co jste uvedla:</strong> {z.duvod}
                    </p>
                  )}

                  {z.poznamkaAdmina && (
                    <p className="rounded-xl bg-linda-sandLight p-4 text-xs text-linda-espresso/85 shadow-neuInsetSm">
                      <strong className="font-semibold text-linda-espresso">Naše vyjádření:</strong>{' '}
                      {z.poznamkaAdmina}
                    </p>
                  )}

                  {!jeVyrizena(z.stav) && (
                    <p className="text-[11px] leading-relaxed text-linda-espresso/70">
                      Zákonná lhůta na vyřízení je {DNU_NA_REKLAMACI} dnů od uplatnění
                      (§ 19 odst. 3 zákona č. 634/1992 Sb.).
                    </p>
                  )}

                  {z.stav === 'VYRIZENA_ZAMITNUTA' && (
                    <p className="text-[11px] leading-relaxed text-linda-espresso/70">
                      Pokud s posouzením nesouhlasíte, ozvěte se nám. Spor lze řešit i mimosoudně
                      u České obchodní inspekce (coi.cz).
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
