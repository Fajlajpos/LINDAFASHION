'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailX } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';
import { Hlaska } from '@/components/ui/PoleFormulare';

/**
 * Potvrzení odhlášení z odběru novinek.
 *
 * Odhlašuje až kliknutí, ne otevření odkazu. Kdyby odhlašoval samotný GET,
 * provedl by ho každý náhledový robot poštovního klienta, který si odkazy
 * v e-mailu předběžně načte – zákaznice by o odběr přišla, aniž by na
 * cokoliv klikla.
 */
export function OdhlaseniNewsletteru({ token, email }: { token: string; email: string }) {
  const [odesila, setOdesila] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  const odhlasit = async () => {
    if (odesila) return;

    setOdesila(true);
    setChyba(null);

    const vysledek = await poslatJson<{ zprava: string }>('/api/newsletter/odhlaseni', { token });

    if (vysledek.ok) setHotovo(vysledek.data.zprava);
    else setChyba(vysledek.chyba);

    setOdesila(false);
  };

  if (hotovo) {
    return (
      <div className="space-y-5">
        <Hlaska druh="uspech">{hotovo}</Hlaska>

        <p className="text-xs leading-relaxed text-linda-espresso/85">
          Přihlásit se zpátky můžete kdykoliv formulářem v patičce webu.
        </p>

        <Link
          href="/"
          className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
        >
          Zpět do obchodu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-linda-espresso/85">
        Chystáte se odhlásit odběr novinek pro adresu{' '}
        <strong className="text-linda-espresso">{email}</strong>. Přestaneme vám posílat informace
        o nových kouscích a slevách; potvrzení objednávek vám chodit nepřestane.
      </p>

      {chyba && <Hlaska druh="chyba">{chyba}</Hlaska>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void odhlasit()}
          disabled={odesila}
          aria-busy={odesila}
          className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {odesila ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Odhlašuji…
            </>
          ) : (
            <>
              <MailX className="h-4 w-4" aria-hidden="true" />
              Odhlásit z odběru
            </>
          )}
        </button>

        <Link
          href="/"
          className="flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
        >
          Nechat odběr zapnutý
        </Link>
      </div>
    </div>
  );
}
