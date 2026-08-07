'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail, Send } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';
import { poslatJson } from '@/lib/api-klient';

export default function ZapomenuteHesloPage() {
  const [email, setEmail] = useState('');
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson<{ zprava: string }>('/api/auth/zapomenute-heslo', { email });

    if (vysledek.ok) {
      setHotovo(vysledek.data.zprava);
    } else {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
    }

    setOdesila(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10">
        <div className="space-y-2 text-center">
          <span className="block font-serif text-2xl font-medium uppercase tracking-[0.15em] text-linda-espresso">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-linda-espresso">Zapomenuté heslo</h1>
          <p className="text-xs text-linda-espresso/75">
            Napište e-mail, kterým se přihlašujete. Pošleme na něj odkaz pro nastavení nového hesla.
          </p>
        </div>

        {hotovo ? (
          <div className="space-y-5">
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl bg-linda-sageLight p-4 text-xs font-medium text-linda-sage"
            >
              <CheckCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              {hotovo}
            </p>

            <Link
              href="/prihlaseni"
              className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cream text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Zpět na přihlášení
            </Link>
          </div>
        ) : (
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
                id="obnova-email"
                label="E-mailová adresa"
                Ikona={Mail}
                type="email"
                required
                autoComplete="email"
                placeholder="vas.email@example.cz"
                value={email}
                onChange={setEmail}
                disabled={odesila}
                chyba={chybyPoli.email}
              />

              <button
                type="submit"
                disabled={odesila}
                aria-busy={odesila}
                className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
              >
                {odesila ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Odesílám…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Poslat odkaz
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-linda-sand/60 pt-4 text-center text-xs text-linda-espresso/75">
              Heslo si vzpomínáte?{' '}
              <Link href="/prihlaseni" className="font-semibold text-linda-cognac underline underline-offset-2">
                Přihlaste se
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
