'use client';

import React, { useState } from 'react';
import { KeyRound, Loader2, Mail, UserRound } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';
import { Hlaska, PoleFormulare } from '@/components/ui/PoleFormulare';

interface Profil {
  email: string;
  jmeno: string | null;
  telefon: string | null;
  newsletterSouhlas: boolean;
}

/**
 * Osobní údaje a heslo.
 *
 * Do téhle chvíle si zákaznice nemohla změnit ani překlep ve jméně: údaje
 * šly zapsat jedině při registraci nebo z administrace. Heslo se dalo změnit
 * výhradně přes „zapomenuté heslo", jehož odkaz chodí e-mailem – a odesílání
 * e-mailů zatím zapojené není, takže si ho fakticky nešlo změnit vůbec.
 */
export function UdajeKarta({ profil }: { profil: Profil }) {
  const [jmeno, setJmeno] = useState(profil.jmeno ?? '');
  const [telefon, setTelefon] = useState(profil.telefon ?? '');
  const [newsletter, setNewsletter] = useState(profil.newsletterSouhlas);

  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [poleChyby, setPoleChyby] = useState<Record<string, string>>({});

  const ulozitProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uklada) return;

    setUklada(true);
    setHlaska(null);
    setChyba(null);
    setPoleChyby({});

    const vysledek = await poslatJson<{ zprava: string }>(
      '/api/ucet',
      { jmeno: jmeno.trim() || null, telefon: telefon.trim() || null, newsletterSouhlas: newsletter },
      'PATCH'
    );

    if (vysledek.ok) setHlaska(vysledek.data.zprava);
    else {
      setChyba(vysledek.chyba);
      setPoleChyby(vysledek.pole ?? {});
    }

    setUklada(false);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
          <UserRound className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
          Osobní údaje
        </h2>

        {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
        {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

        <form onSubmit={ulozitProfil} className="space-y-4">
          {/*
            E-mail se schválně měnit nedá. Je to přihlašovací jméno i adresa,
            na kterou chodí doklady – změna proto potřebuje ověřit novou
            schránku, a to bez funkčního odesílání e-mailů udělat nejde.
            Pole je zapuštěné a zašedlé, aby to bylo vidět dřív, než do něj
            někdo začne psát.
          */}
          <div>
            <label htmlFor="ucet-email" className="mb-1 block text-xs font-semibold text-linda-espresso">
              E-mail
            </label>
            <div className="relative">
              <input
                id="ucet-email"
                type="email"
                value={profil.email}
                readOnly
                aria-describedby="ucet-email-napoveda"
                className="min-h-touch w-full cursor-not-allowed rounded-xl bg-linda-sandLight py-2.5 pl-10 pr-4 text-xs text-linda-espresso/70 shadow-neuInsetSm"
              />
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linda-cognac"
                aria-hidden="true"
              />
            </div>
            <p id="ucet-email-napoveda" className="mt-1.5 text-[11px] text-linda-espresso/70">
              E-mail slouží k přihlášení a chodí na něj doklady. Potřebujete-li ho změnit, napište
              nám prosím přes kontaktní formulář.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PoleFormulare
              id="ucet-jmeno"
              label="Jméno a příjmení"
              value={jmeno}
              onChange={setJmeno}
              autoComplete="name"
              maxLength={120}
              disabled={uklada}
              chyba={poleChyby.jmeno}
            />

            <PoleFormulare
              id="ucet-telefon"
              label="Telefon"
              type="tel"
              inputMode="tel"
              value={telefon}
              onChange={setTelefon}
              autoComplete="tel"
              maxLength={40}
              disabled={uklada}
              chyba={poleChyby.telefon}
              napoveda="Použijeme ho jen kvůli doručení zásilky."
            />
          </div>

          <label
            htmlFor="ucet-newsletter"
            className="flex cursor-pointer items-start gap-3 rounded-xl bg-linda-sandLight p-3 shadow-neuInsetSm"
          >
            <input
              id="ucet-newsletter"
              type="checkbox"
              checked={newsletter}
              disabled={uklada}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac disabled:cursor-not-allowed"
            />
            <span className="text-xs leading-relaxed text-linda-espresso">
              Chci dostávat novinky a informace o slevách.
              <span className="mt-0.5 block text-[11px] text-linda-espresso/70">
                Souhlas můžete kdykoliv odvolat – tady nebo odkazem v každém e-mailu.
              </span>
            </span>
          </label>

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
              'Uložit údaje'
            )}
          </button>
        </form>
      </section>

      <HesloKarta />
    </div>
  );
}

/** Změna hesla. Samostatná karta – s profilem nemá společné ani odeslání. */
function HesloKarta() {
  const [stareHeslo, setStareHeslo] = useState('');
  const [heslo, setHeslo] = useState('');
  const [hesloZnovu, setHesloZnovu] = useState('');

  const [meni, setMeni] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [poleChyby, setPoleChyby] = useState<Record<string, string>>({});

  const zmenit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (meni) return;

    setMeni(true);
    setHlaska(null);
    setChyba(null);
    setPoleChyby({});

    const vysledek = await poslatJson<{ zprava: string }>('/api/ucet/zmena-hesla', {
      stareHeslo,
      heslo,
      hesloZnovu,
    });

    if (vysledek.ok) {
      setHlaska(vysledek.data.zprava);
      // Hesla v poli po úspěchu nenecháváme ležet.
      setStareHeslo('');
      setHeslo('');
      setHesloZnovu('');
    } else {
      setChyba(vysledek.chyba);
      setPoleChyby(vysledek.pole ?? {});
    }

    setMeni(false);
  };

  return (
    <section className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
      <h2 className="flex items-center gap-2 font-serif text-2xl text-linda-espresso">
        <KeyRound className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
        Změna hesla
      </h2>

      <p className="text-xs leading-relaxed text-linda-espresso/85">
        Po změně vás pro jistotu odhlásíme na všech ostatních zařízeních. Tady zůstanete
        přihlášená.
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}
      {hlaska && <Hlaska druh="uspech">{hlaska}</Hlaska>}

      <form onSubmit={zmenit} className="space-y-4">
        <PoleFormulare
          id="ucet-stare-heslo"
          label="Stávající heslo"
          type="password"
          required
          value={stareHeslo}
          onChange={setStareHeslo}
          autoComplete="current-password"
          disabled={meni}
          chyba={poleChyby.stareHeslo}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PoleFormulare
            id="ucet-nove-heslo"
            label="Nové heslo"
            type="password"
            required
            value={heslo}
            onChange={setHeslo}
            autoComplete="new-password"
            disabled={meni}
            chyba={poleChyby.heslo}
            napoveda="Alespoň 8 znaků, jedno písmeno a jedna číslice."
          />

          <PoleFormulare
            id="ucet-nove-heslo-znovu"
            label="Nové heslo znovu"
            type="password"
            required
            value={hesloZnovu}
            onChange={setHesloZnovu}
            autoComplete="new-password"
            disabled={meni}
            chyba={poleChyby.hesloZnovu}
          />
        </div>

        <button
          type="submit"
          disabled={meni}
          aria-busy={meni}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {meni ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Měním…
            </>
          ) : (
            'Změnit heslo'
          )}
        </button>
      </form>
    </section>
  );
}
