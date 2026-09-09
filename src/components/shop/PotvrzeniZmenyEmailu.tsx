'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2, MailCheck } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

/**
 * Dokončení změny přihlašovacího e-mailu.
 *
 * **Potvrzuje se tlačítkem, ne otevřením odkazu.** Kdyby změnu dokončil
 * samotný `GET`, provedl by ji náhledový robot poštovního klienta dřív, než
 * si zákaznice zprávu přečte – stejná past, kvůli které je POST i potvrzení
 * newsletteru a odhlášení z něj.
 *
 * Přihlášení se nevyžaduje: potvrzuje se z nové schránky, klidně na jiném
 * zařízení. Důkazem je token, ne session.
 */
export function PotvrzeniZmenyEmailu({ token }: { token: string | null }) {
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const potvrdit = async () => {
    if (odesila || !token) return;

    setOdesila(true);
    setChyba(null);

    const vysledek = await poslatJson<{ zprava: string; email: string }>(
      '/api/ucet/zmena-emailu/potvrzeni',
      { token }
    );

    if (vysledek.ok) setHotovo(vysledek.data.zprava);
    else setChyba(vysledek.chyba);

    setOdesila(false);
  };

  if (!token) {
    return (
      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <p className="flex items-start gap-2 text-xs font-medium text-red-800">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          Odkaz je neúplný. Otevřete prosím ten z e-mailu celý, včetně části za otazníkem.
        </p>
        <Link
          href="/muj-ucet"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Zpět do účtu
        </Link>
      </div>
    );
  }

  if (hotovo) {
    return (
      <div className="animate-fadeInUp space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linda-sageLight">
            <CheckCircle className="h-5 w-5 text-linda-sage" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-2xl text-linda-espresso">E-mail jsme změnili</h2>
            <p className="mt-1 text-xs leading-relaxed text-linda-espresso/85">{hotovo}</p>
          </div>
        </div>

        <Link
          href="/prihlaseni"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linda-sandLight shadow-neuInsetSm">
          <MailCheck className="h-5 w-5 text-linda-cognac" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-serif text-2xl text-linda-espresso">Potvrdit novou adresu</h2>
          <p className="mt-1 text-xs leading-relaxed text-linda-espresso/85">
            Kliknutím níž přepíšeme přihlašovací e-mail vašeho účtu na tuhle adresu. Z bezpečnostních
            důvodů vás pak odhlásíme na všech zařízeních.
          </p>
        </div>
      </div>

      {chyba && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium text-red-800 shadow-neuInsetSm"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <button
        type="button"
        onClick={() => void potvrdit()}
        disabled={odesila}
        aria-busy={odesila}
        className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {odesila && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Potvrdit změnu e-mailu
      </button>

      <p className="text-[11px] leading-relaxed text-linda-espresso/70">
        O změnu jste nežádala? Pak tuhle stránku zavřete – bez potvrzení se na účtu nic nezmění.
        Doporučujeme si ale pro jistotu změnit heslo.
      </p>
    </div>
  );
}
