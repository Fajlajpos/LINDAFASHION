'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Lock, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';
import { poslatJson } from '@/lib/api-klient';

function PrihlaseniFormular() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poRegistraci = searchParams.get('registrace') === 'ok';
  /** Kam zákaznice mířila, než ji middleware poslal sem. */
  const dalsi = searchParams.get('dalsi');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);
    setChybyPoli({});

    const vysledek = await poslatJson<{ presmerovat: string }>('/api/auth/prihlaseni', {
      email,
      heslo: password,
    });

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
      setOdesila(false);
      return;
    }

    // `dalsi` je vždy jen cesta v rámci webu (nastavuje ho middleware),
    // ale pro jistotu odmítáme absolutní URL – ať z toho nejde udělat
    // otevřené přesměrování na cizí web.
    const cil = dalsi?.startsWith('/') && !dalsi.startsWith('//') ? dalsi : vysledek.data.presmerovat;

    router.push(cil);
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12">
      {/* Karta má barvu stránky – nadzvedává ji reliéf, ne rámeček. */}
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10">
        <div className="space-y-2 text-center">
          <span className="block font-serif text-2xl font-medium uppercase tracking-[0.15em] text-linda-espresso">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-linda-espresso">Přihlášení k účtu</h1>
          <p className="text-xs text-linda-espresso/70">
            Přihlaste se ke své historii objednávek a oblíbeným kouskům
          </p>
        </div>

        {poRegistraci && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-linda-sageLight p-3 text-xs font-medium text-linda-sage shadow-neuInsetSm"
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Registrace proběhla úspěšně. Nyní se můžete přihlásit.
          </p>
        )}

        {chyba && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            {chyba}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <AuthField
            id="prihlaseni-email"
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

          <AuthField
            id="prihlaseni-heslo"
            label="Heslo"
            Ikona={Lock}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            disabled={odesila}
            chyba={chybyPoli.heslo}
            akce={
              <Link
                href="/zapomenute-heslo"
                className="text-[11px] font-medium text-linda-cognac transition-colors hover:text-linda-cognacHover hover:underline"
              >
                Zapomněli jste heslo?
              </Link>
            }
          />

          {/* Turnstile Spam Protection readiness */}
          <p className="flex items-center gap-2 rounded-xl bg-linda-sandLight p-3 text-[10px] text-linda-espresso/75 shadow-neuInsetSm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-linda-sage" aria-hidden="true" />
            Ochrana proti botům (Cloudflare Turnstile aktivní)
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
                Přihlašuji…
              </>
            ) : (
              <>
                Přihlásit se
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-linda-sand/60 pt-4 text-center text-xs text-linda-espresso/75">
          Nemáte ještě účet?{' '}
          <Link href="/registrace" className="font-semibold text-linda-cognac underline underline-offset-2">
            Zaregistrujte se
          </Link>
        </div>
      </div>
    </div>
  );
}

/** `useSearchParams()` vyžaduje hranici Suspense, jinak by se celá routa
 *  vykreslovala až na klientovi. */
export default function PrihlaseniPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12 text-xs text-linda-espresso/70">
          Načítání přihlášení…
        </div>
      }
    >
      <PrihlaseniFormular />
    </Suspense>
  );
}
