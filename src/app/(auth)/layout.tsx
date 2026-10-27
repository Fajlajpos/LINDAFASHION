import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Přihlášení, registrace a obnova hesla stojí mimo `(shop)`, takže nemají
 * hlavičku ani patičku – formulář má celou pozornost. Jenže ze stránky pak
 * nevedla žádná cesta zpátky: kdo si registraci rozmyslel, musel hledat
 * tlačítko Zpět v prohlížeči (a po přímém příchodu z e-mailu ani to ne).
 *
 * Odkaz vede na úvodní stránku, ne `router.back()` – historie může vést
 * mimo web nebo být prázdná.
 *
 * Plocha je `cream` stejně jako stránky uvnitř; bez toho by nad jejich
 * krémovým blokem `min-h-[80vh]` zůstal pruh podkladové `paper`.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linda-cream">
      <nav
        aria-label="Návrat do obchodu"
        className="mx-auto flex max-w-7xl items-center px-4 pt-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="group inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-semibold uppercase tracking-wider text-linda-espresso/80 transition-colors duration-200 hover:text-linda-cognac"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Zpět do obchodu
        </Link>
      </nav>

      {children}
    </div>
  );
}
