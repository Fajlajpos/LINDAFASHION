import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linda-cream p-4 text-linda-espresso">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 text-center shadow-neuLg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linda-sandLight text-linda-cognac shadow-neuInset">
          <Sparkles className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="block font-serif text-6xl font-semibold text-linda-cognac">404</span>
          <h1 className="font-serif text-3xl text-linda-espresso">Stránka nebyla nalezena</h1>
          <p className="text-xs font-light leading-relaxed text-linda-espresso/75">
            Omlouváme se, ale hledaná stránka nebo model oblečení již neexistuje nebo byla přesunuta do jiné kolekce.
          </p>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Návrat na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
