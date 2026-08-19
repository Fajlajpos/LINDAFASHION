'use client';

import React from 'react';
import { Printer } from 'lucide-react';

/**
 * Tisk stránky.
 *
 * Vlastní komponenta jen kvůli `window.print()` – stránka s formulářem je
 * jinak celá serverová a nemá důvod se hydratovat. Při tisku sama sebe skryje
 * (`data-tisk="skryt"`, pravidlo v `globals.css`): tlačítko „Vytisknout"
 * vytištěné na papíře je nesmysl, který navíc zabírá řádek ve formuláři.
 */
export function TiskoveTlacitko({ popis = 'Vytisknout' }: { popis?: string }) {
  return (
    <button
      type="button"
      data-tisk="skryt"
      onClick={() => window.print()}
      className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
    >
      <Printer className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
      {popis}
    </button>
  );
}
