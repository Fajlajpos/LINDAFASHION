'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Obsah záchytné obrazovky pro chyby na serveru.
 *
 * Sdílí ji `app/error.tsx` i `app/(shop)/error.tsx` – liší se jen tím, kam
 * v hierarchii patří. Obchodní verze sedí uvnitř `(shop)/layout.tsx`, takže
 * zákaznici zůstane hlavička i patička a může odejít kamkoliv; kořenová je
 * pojistka pro administraci a přihlašování.
 *
 * Detail chyby se ven nedostane – jen `digest`, podle kterého se dá záznam
 * najít v logu. Zpráva z výjimky může nést název tabulky nebo adresu serveru.
 */
export function ChybovaObrazovka({
  error,
  reset,
  kde,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Jen do logu, ať je poznat, která hranice zabrala. */
  kde: string;
}) {
  useEffect(() => {
    console.error(`[${kde}] Neošetřená chyba:`, error);
  }, [error, kde]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 text-center shadow-neuLg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sandLight text-linda-cognac shadow-neuInset">
          <AlertTriangle className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl text-linda-espresso">Něco se pokazilo</h1>
          <p className="text-xs font-light leading-relaxed text-linda-espresso/75">
            Na naší straně nastala chyba a stránku se nepodařilo načíst. Zkuste to prosím znovu –
            obvykle pomůže i za pár vteřin.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Zkusit znovu
          </button>

          <Link
            href="/"
            className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-6 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            Na hlavní stránku
          </Link>
        </div>

        {/* Podle kódu dohledáme konkrétní záznam v logu, aniž bychom
            zákaznici ukazovali obsah výjimky. */}
        {error.digest && (
          <p className="rounded-xl bg-linda-sandLight p-3 text-[11px] text-linda-espresso/70 shadow-neuInsetSm">
            Kód chyby: <span className="font-semibold">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
