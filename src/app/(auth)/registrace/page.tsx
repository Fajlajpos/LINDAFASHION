'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthField } from '@/components/ui/AuthField';

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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.souhlasOP) {
      setSouhlasError('Pro registraci je nutné souhlasit s Obchodními podmínkami.');
      return;
    }
    setSouhlasError(null);
    // Úspěch dřív hlásil `alert()` těsně před přesměrováním – okno tedy
    // zmizelo zároveň se stránkou. Potvrzení proto předáváme přihlášení,
    // které ho vypíše nad formulářem.
    router.push('/prihlaseni?registrace=ok');
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
          />

          <AuthField
            id="registrace-heslo"
            label="Heslo"
            Ikona={Lock}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Alespoň 8 znaků"
            value={formData.password}
            onChange={(v) => setFormData({ ...formData, password: v })}
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
            className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linda-cognac py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Vytvořit účet
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
