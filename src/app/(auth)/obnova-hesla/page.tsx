'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Loader2, Lock } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';
import { nacist, poslatJson } from '@/lib/api-klient';

function ObnovaFormular() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [platnost, setPlatnost] = useState<'overuji' | 'platny' | 'neplatny'>('overuji');
  const [heslo, setHeslo] = useState('');
  const [hesloZnovu, setHesloZnovu] = useState('');
  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  // Platnost ověřujeme dopředu, ať zákaznice nevyplňuje formulář, který
  // stejně skončí chybou "odkaz vypršel".
  useEffect(() => {
    if (!token) {
      setPlatnost('neplatny');
      return;
    }

    void (async () => {
      const vysledek = await nacist<{ platny: boolean }>(
        `/api/auth/obnova-hesla?token=${encodeURIComponent(token)}`
      );
      setPlatnost(vysledek.ok && vysledek.data.platny ? 'platny' : 'neplatny');
    })();
  }, [token]);

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson<{ presmerovat: string }>('/api/auth/obnova-hesla', {
      token,
      heslo,
      hesloZnovu,
    });

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
      setOdesila(false);
      return;
    }

    router.push(vysledek.data.presmerovat);
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10">
        <div className="space-y-2 text-center">
          <span className="block font-serif text-2xl font-medium uppercase tracking-[0.15em] text-linda-espresso">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-linda-espresso">Nové heslo</h1>
        </div>

        {platnost === 'overuji' && (
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-linda-espresso/75">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Ověřuji odkaz…
          </p>
        )}

        {platnost === 'neplatny' && (
          <div className="space-y-5">
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-4 text-xs font-medium text-red-800 shadow-neuInsetSm"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              Tento odkaz už neplatí. Odkazy pro obnovu hesla vydrží jednu hodinu a lze je použít jen jednou.
            </p>

            <Link
              href="/zapomenute-heslo"
              className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
            >
              Požádat o nový odkaz
            </Link>
          </div>
        )}

        {platnost === 'platny' && (
          <>
            {chyba && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
              >
                <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                {chyba}
              </p>
            )}

            <form onSubmit={odeslat} className="space-y-4">
              <AuthField
                id="obnova-heslo"
                label="Nové heslo"
                Ikona={Lock}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Alespoň 8 znaků, z toho jedno písmeno a jedna číslice"
                value={heslo}
                onChange={setHeslo}
                disabled={odesila}
                chyba={chybyPoli.heslo}
              />

              <AuthField
                id="obnova-heslo-znovu"
                label="Heslo pro kontrolu"
                Ikona={Lock}
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={hesloZnovu}
                onChange={setHesloZnovu}
                disabled={odesila}
                chyba={chybyPoli.hesloZnovu}
              />

              <p className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/75 shadow-neuInsetSm">
                Po změně hesla vás pro jistotu odhlásíme ze všech ostatních zařízení.
              </p>

              <button
                type="submit"
                disabled={odesila}
                aria-busy={odesila}
                className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
              >
                {odesila ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Ukládám…
                  </>
                ) : (
                  <>
                    Nastavit heslo
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/** `useSearchParams()` vyžaduje hranici Suspense. */
export default function ObnovaHeslaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 text-xs text-linda-espresso/75">
          Načítání…
        </div>
      }
    >
      <ObnovaFormular />
    </Suspense>
  );
}
