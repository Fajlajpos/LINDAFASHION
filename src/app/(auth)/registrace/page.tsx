'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';
import { poslatJson } from '@/lib/api-klient';

export default function RegistracePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    jmeno: '',
    email: '',
    password: '',
    souhlasOP: false, // Povinný souhlas s OP
    souhlasNewsletter: false, // Samostatný dobrovolný souhlas pro GDPR
  });

  // Chybu chybějícího souhlasu hlásil `alert()` – systémové okno vytrhne
  // z kontextu a nezůstane u zaškrtávátka, kterého se týká.
  const [souhlasError, setSouhlasError] = useState<string | null>(null);
  const [odesila, setOdesila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [chybyPoli, setChybyPoli] = useState<Record<string, string>>({});

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    if (!formData.souhlasOP) {
      setSouhlasError('Pro registraci je nutné souhlasit s Obchodními podmínkami.');
      return;
    }

    setSouhlasError(null);
    setChyba(null);
    setChybyPoli({});
    setOdesila(true);

    const vysledek = await poslatJson('/api/auth/registrace', {
      jmeno: formData.jmeno,
      email: formData.email,
      heslo: formData.password,
      hesloZnovu: formData.password,
      souhlasPodminky: formData.souhlasOP,
      newsletterSouhlas: formData.souhlasNewsletter,
    });

    if (!vysledek.ok) {
      setChyba(vysledek.chyba);
      setChybyPoli(vysledek.pole ?? {});
      if (vysledek.pole?.souhlasPodminky) setSouhlasError(vysledek.pole.souhlasPodminky);
      setOdesila(false);
      return;
    }

    // Registrace rovnou přihlašuje (server nastavil session cookie),
    // takže míříme na účet, ne zpátky na přihlašovací formulář.
    router.push('/muj-ucet');
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10">
        <div className="space-y-2 text-center">
          <span className="block font-serif text-2xl font-medium uppercase tracking-[0.15em] text-linda-espresso">
            LINDA FASHION
          </span>
          <h1 className="font-serif text-3xl text-linda-espresso">Nová registrace</h1>
          <p className="text-xs text-linda-espresso/70">
            Vytvořte si osobní profil pro pohodlnější nákupy a ukládání oblíbených
          </p>
        </div>

        {chyba && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-linda-sandLight p-3 text-xs font-medium text-red-800 shadow-neuInsetSm"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            {chyba}
          </p>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <AuthField
            id="registrace-jmeno"
            label="Jméno a příjmení"
            Ikona={User}
            required
            autoComplete="name"
            placeholder="Marie Nováková"
            value={formData.jmeno}
            onChange={(v) => setFormData({ ...formData, jmeno: v })}
            disabled={odesila}
            chyba={chybyPoli.jmeno}
          />

          <AuthField
            id="registrace-email"
            label="E-mailová adresa"
            Ikona={Mail}
            type="email"
            required
            autoComplete="email"
            placeholder="vas.email@example.cz"
            value={formData.email}
            onChange={(v) => setFormData({ ...formData, email: v })}
            disabled={odesila}
            chyba={chybyPoli.email}
          />

          <AuthField
            id="registrace-heslo"
            label="Heslo"
            Ikona={Lock}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Alespoň 8 znaků, z toho jedno písmeno a jedna číslice"
            value={formData.password}
            onChange={(v) => setFormData({ ...formData, password: v })}
            disabled={odesila}
            chyba={chybyPoli.heslo ?? chybyPoli.hesloZnovu}
          />

          {/* Consents */}
          <div className="space-y-3 rounded-xl bg-linda-sandLight p-4 text-xs shadow-neuInsetSm">
            {/* Mandatory OP */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                required
                checked={formData.souhlasOP}
                onChange={(e) => {
                  setFormData({ ...formData, souhlasOP: e.target.checked });
                  if (e.target.checked) setSouhlasError(null);
                }}
                aria-invalid={Boolean(souhlasError)}
                aria-describedby={souhlasError ? 'registrace-souhlas-chyba' : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/85">
                Souhlasím s{' '}
                <Link href="/obchodni-podminky" target="_blank" className="font-semibold text-linda-cognac underline">
                  Obchodními podmínkami
                </Link>{' '}
                a ochranou osobních údajů. *
              </span>
            </label>

            {souhlasError && (
              <p
                id="registrace-souhlas-chyba"
                role="alert"
                className="flex items-center gap-1.5 font-medium text-linda-cognac"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {souhlasError}
              </p>
            )}

            {/* Voluntary Newsletter Consent (Separate as required by GDPR Section 5) */}
            <label className="flex cursor-pointer items-start gap-2.5 border-t border-linda-sand/60 pt-3">
              <input
                type="checkbox"
                checked={formData.souhlasNewsletter}
                onChange={(e) => setFormData({ ...formData, souhlasNewsletter: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
              />
              <span className="text-linda-espresso/75">
                Chci odebírat inspirativní novinky z nových italských kolekcí (dobrovolný souhlas).
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={odesila}
            aria-busy={odesila}
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {odesila ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Zakládám účet…
              </>
            ) : (
              <>
                Vytvořit účet
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-linda-sand/60 pt-4 text-center text-xs text-linda-espresso/75">
          Již máte účet?{' '}
          <Link href="/prihlaseni" className="font-semibold text-linda-cognac underline underline-offset-2">
            Přihlaste se
          </Link>
        </div>
      </div>
    </div>
  );
}
