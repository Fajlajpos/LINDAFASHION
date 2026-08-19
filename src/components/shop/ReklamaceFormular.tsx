'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { nacist, poslatJson } from '@/lib/api-klient';
import { OblastFormulare, PoleFormulare, Hlaska } from '@/components/ui/PoleFormulare';
import { DNU_NA_REKLAMACI } from '@/lib/lhuty';

/**
 * Reklamace vady **bez přihlášení**.
 *
 * Právo z vadného plnění má každý kupující, ne jen ten s účtem – a objednávka
 * bez registrace žádný `userId` nemá. Dosud proto zákaznice bez účtu neměla jak
 * reklamaci uplatnit, přestože jí zákon dává úplně stejná práva.
 *
 * Autorizace je stejná jako u odstoupení: token z e-mailu, nebo číslo
 * objednávky spolu s e-mailem. Číslo samotné klíčem není, jde po sobě.
 *
 * Přihlášená zákaznice tenhle formulář nepotřebuje – v účtu má reklamace
 * u konkrétní objednávky i s přehledem jejich stavu. Odkaz tam vede z konce
 * stránky.
 */

interface Polozka {
  id: string;
  nazev: string;
  velikost: string;
  mnozstvi: number;
}

interface Nalezena {
  cisloObjednavky: string;
  token: string;
  datumObjednani: string;
  datumDoruceni: string | null;
  polozky: Polozka[];
}

type OdpovedHledani = { nalezeno: true; objednavka: Nalezena } | { nalezeno: false; zprava: string };

export function ReklamaceFormular({ tokenZOdkazu }: { tokenZOdkazu?: string }) {
  const [objednavka, setObjednavka] = useState<Nalezena | null>(null);
  const [hotovo, setHotovo] = useState<string | null>(null);

  const [cislo, setCislo] = useState('');
  const [email, setEmail] = useState('');
  const [polozkaId, setPolozkaId] = useState('');
  const [duvod, setDuvod] = useState('');

  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const najit = useCallback(async (dotaz: string) => {
    setNacitam(true);
    setChyba(null);
    setChybyPoli({});

    const odpoved = await nacist<OdpovedHledani>(`/api/reklamace/objednavka?${dotaz}`);

    if (!odpoved.ok) {
      setChyba(odpoved.chyba);
      setChybyPoli(odpoved.pole ?? {});
    } else if (!odpoved.data.nalezeno) {
      setChyba(odpoved.data.zprava);
    } else {
      setObjednavka(odpoved.data.objednavka);
    }

    setNacitam(false);
  }, []);

  useEffect(() => {
    if (tokenZOdkazu) void najit(`token=${encodeURIComponent(tokenZOdkazu)}`);
  }, [tokenZOdkazu, najit]);

  const odeslatHledani = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nacitam) return;

    await najit(
      `cisloObjednavky=${encodeURIComponent(cislo.trim())}&email=${encodeURIComponent(email.trim())}`
    );
  };

  const odeslatReklamaci = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objednavka || nacitam) return;

    setNacitam(true);
    setChyba(null);
    setChybyPoli({});

    const odpoved = await poslatJson<{ zprava: string }>('/api/reklamace', {
      token: objednavka.token,
      typ: 'REKLAMACE',
      orderItemId: polozkaId || null,
      duvod: duvod.trim(),
    });

    if (odpoved.ok) setHotovo(odpoved.data.zprava);
    else {
      setChyba(odpoved.chyba);
      setChybyPoli(odpoved.pole ?? {});
    }

    setNacitam(false);
  };

  /* --- Hotovo ---------------------------------------------------------- */
  if (hotovo) {
    return (
      <section className="animate-fadeInUp space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linda-sageLight">
            <CheckCircle className="h-5 w-5 text-linda-sage" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-2xl text-linda-espresso">Reklamaci jsme přijali</h2>
            <p className="mt-1 text-xs leading-relaxed text-linda-espresso/85">{hotovo}</p>
          </div>
        </div>

        <p className="rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
          Ze zákona ji musíme vyřídit nejpozději do {DNU_NA_REKLAMACI} dnů od uplatnění
          (§ 19 odst. 3 zák. č. 634/1992 Sb.). Ozveme se vám e-mailem s tím, jak dál se zbožím.
        </p>

        <Link
          href="/produkty"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Zpět do obchodu
        </Link>
      </section>
    );
  }

  /* --- Formulář reklamace ---------------------------------------------- */
  if (objednavka) {
    return (
      <form
        onSubmit={(e) => void odeslatReklamaci(e)}
        className="animate-fadeInUp space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8"
      >
        <div>
          <h2 className="font-serif text-2xl text-linda-espresso">
            Objednávka {objednavka.cisloObjednavky}
          </h2>
          <p className="mt-1 text-xs text-linda-espresso/75">
            Vyberte kousek, se kterým je potíž, a popište, co se stalo.
          </p>
        </div>

        <div>
          <label
            htmlFor="reklamace-polozka"
            className="mb-1 block text-xs font-semibold text-linda-espresso"
          >
            Které zboží reklamujete?
          </label>
          <select
            id="reklamace-polozka"
            value={polozkaId}
            disabled={nacitam}
            onChange={(e) => setPolozkaId(e.target.value)}
            className="min-h-touch w-full cursor-pointer rounded-xl bg-linda-sandLight px-4 py-2.5 text-xs text-linda-espresso shadow-neuInsetSm disabled:opacity-60"
          >
            <option value="">Celá objednávka</option>
            {objednavka.polozky.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nazev} · {p.velikost} ({p.mnozstvi} ks)
              </option>
            ))}
          </select>
          {chybyPoli.orderItemId && (
            <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-800">
              {chybyPoli.orderItemId}
            </p>
          )}
        </div>

        <OblastFormulare
          id="reklamace-duvod"
          label="Co se stalo?"
          required
          napoveda="Popište vadu co nejkonkrétněji – kde se objevila, kdy jste si jí všimla a jak jste kousek nosila a prala."
          value={duvod}
          onChange={setDuvod}
          rows={5}
          maxLength={2000}
          placeholder="Po druhém praní se rozpáral šev na levém rukávu…"
          disabled={nacitam}
          chyba={chybyPoli.duvod}
        />

        {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={nacitam || duvod.trim().length < 10}
            className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nacitam ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Odesílám…
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" aria-hidden="true" />
                Odeslat reklamaci
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setObjednavka(null);
              setChyba(null);
            }}
            disabled={nacitam}
            className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm disabled:opacity-60 sm:flex-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Zpět
          </button>
        </div>
      </form>
    );
  }

  /* --- Vyhledání objednávky -------------------------------------------- */
  return (
    <form
      onSubmit={(e) => void odeslatHledani(e)}
      className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8"
      noValidate
    >
      <div>
        <h2 className="font-serif text-2xl text-linda-espresso">Najdeme vaši objednávku</h2>
        <p className="mt-1 text-xs text-linda-espresso/75">
          Přihlašovat se nemusíte. Číslo objednávky i e-mail najdete v potvrzovacím e-mailu.
        </p>
      </div>

      <PoleFormulare
        id="reklamace-cislo"
        label="Číslo objednávky"
        required
        value={cislo}
        onChange={setCislo}
        placeholder="2026-00042"
        maxLength={40}
        autoComplete="off"
        disabled={nacitam}
        chyba={chybyPoli.cisloObjednavky}
      />

      <PoleFormulare
        id="reklamace-email"
        label="E-mail z objednávky"
        required
        type="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        placeholder="vas@email.cz"
        maxLength={200}
        autoComplete="email"
        disabled={nacitam}
        chyba={chybyPoli.email}
      />

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      <button
        type="submit"
        disabled={nacitam || !cislo.trim() || !email.trim()}
        className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nacitam ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Hledám objednávku…
          </>
        ) : (
          'Pokračovat'
        )}
      </button>
    </form>
  );
}
