'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, BellRing, Check, Loader2 } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

interface Props {
  variantId: string;
  velikost: string;
}

/**
 * „Upozornit, až bude skladem" u vyprodané velikosti (sekce 14).
 *
 * Tlačítko bylo dřív natrvalo zakázané – nebylo kam požadavek poslat.
 * Rozbalí se do jednoho pole, ne do modálu: jde o jeden e-mail, ne o formulář.
 */
export function HlidaniSkladu({ variantId, velikost }: Props) {
  const [otevreno, setOtevreno] = useState(false);
  const [email, setEmail] = useState('');
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  // Přepnutí na jinou vyprodanou velikost je nový požadavek – potvrzení
  // z té předchozí by tvrdilo něco, co pro tuhle neplatí.
  useEffect(() => {
    setOtevreno(false);
    setHotovo(false);
    setChyba(null);
  }, [variantId]);

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (odesila) return;

    setOdesila(true);
    setChyba(null);

    const vysledek = await poslatJson<{ zprava: string }>('/api/hlidani-skladu', {
      variantId,
      email,
    });

    if (vysledek.ok) {
      setHotovo(true);
      setEmail('');
    } else {
      setChyba(vysledek.pole?.email ?? vysledek.chyba);
    }

    setOdesila(false);
  };

  if (hotovo) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-xs font-medium text-linda-sage"
      >
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        Napíšeme vám, jakmile bude velikost {velikost} zase skladem.
      </p>
    );
  }

  if (!otevreno) {
    return (
      <button
        type="button"
        onClick={() => setOtevreno(true)}
        className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-espresso px-5 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm"
      >
        <BellRing className="h-4 w-4" aria-hidden="true" />
        Upozornit, až bude skladem
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void odeslat(e)} className="space-y-2 text-left">
      <label htmlFor="hlidani-email" className="block text-xs font-semibold text-linda-espresso">
        Váš e-mail
      </label>

      <div className="flex gap-2">
        <input
          id="hlidani-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vas@email.cz"
          disabled={odesila}
          aria-invalid={chyba ? true : undefined}
          aria-describedby={chyba ? 'hlidani-chyba' : undefined}
          className="min-h-touch flex-1 rounded-full bg-linda-cream px-4 text-xs text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/60"
        />
        <button
          type="submit"
          disabled={odesila}
          aria-busy={odesila}
          className="flex min-h-touch shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-linda-espresso px-5 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {odesila ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            'Hlídat'
          )}
        </button>
      </div>

      {chyba && (
        <p
          id="hlidani-chyba"
          role="alert"
          className="flex items-start gap-1.5 text-[11px] font-medium text-red-800"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {chyba}
        </p>
      )}

      <p className="text-[10px] text-linda-espresso/70">
        E-mail použijeme jen na tohle jedno upozornění.
      </p>
    </form>
  );
}
