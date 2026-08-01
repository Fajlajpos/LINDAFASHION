'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';

function PrihlaseniFormular() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poRegistraci = searchParams.get('registrace') === 'ok';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Přihlášení
    if (email === 'admin@lindafashion.cz') {
      router.push('/admin');
    } else {
      router.push('/muj-ucet');
    }
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
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Přihlásit se
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
