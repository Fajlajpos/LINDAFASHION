'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';
import { Hlaska } from '@/components/ui/PoleFormulare';

/**
 * Dokončení double opt-inu k odběru novinek.
 *
 * Potvrzuje až kliknutí, ne otevření odkazu. Náhledový robot poštovního
 * klienta si odkazy v e-mailu předběžně načte – kdyby potvrzoval GET, vznikl
 * by souhlas, na který zákaznice nikdy neklikla. A právě ten souhlas má
 * double opt-in doložit.
 */
export function PotvrzeniNewsletteru({ token, email }: { token: string; email: string }) {
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const potvrdit = async () => {
    if (odesila) return;

    setOdesila(true);
    setChyba(null);

    const vysledek = await poslatJson<{ zprava: string }>('/api/newsletter/potvrzeni', { token });

    if (vysledek.ok) setHotovo(vysledek.data.zprava);
    else setChyba(vysledek.chyba);

    setOdesila(false);
  };

  if (hotovo) {
    return (
      <div className="space-y-5">
        <Hlaska druh="uspech">{hotovo}</Hlaska>

        <p className="text-xs leading-relaxed text-linda-espresso/85">
          Odhlásit se můžete kdykoliv odkazem v patičce každé zprávy.
        </p>

        <Link
          href="/produkty"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Prohlédnout novinky
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-linda-espresso/85">
        Ještě potvrďte, že odběr novinek pro adresu{' '}
        <strong className="text-linda-espresso">{email}</strong> chcete opravdu vy. Posíláme jen
        novinky a slevy, nejvýš párkrát do měsíce.
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void potvrdit()}
          disabled={odesila}
          aria-busy={odesila}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {odesila ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Potvrzuji…
            </>
          ) : (
            <>
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Potvrdit odběr
            </>
          )}
        </button>

        <Link
          href="/"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Zpět do obchodu
        </Link>
      </div>
    </div>
  );
}
