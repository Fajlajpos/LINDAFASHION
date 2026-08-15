import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Obecná kostra obchodu – platí pro každou stránku, která nemá vlastní
 * (`/kosik`, `/muj-ucet`, `/kontakt`, textové stránky, domovská stránka).
 *
 * Katalog a detail produktu mají vlastní `loading.tsx` s přesnějším tvarem;
 * tahle je záměrně neutrální: nadpis, odstavec, plocha. Nesnaží se hádat
 * rozvržení, které nezná – jen okamžitě potvrdí kliknutí a udrží hlavičku
 * i patičku na místě, dokud server nedorenderuje obsah.
 */
export default function NacitaniObchodu() {
  return (
    <KostraObal className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <Kostra className="h-3 w-40" />
        <Kostra className="h-11 w-2/3 max-w-md" />
      </div>

      <div className="space-y-4 rounded-2xl bg-linda-cream p-8 shadow-neu">
        <Kostra className="h-3 w-full" />
        <Kostra className="h-3 w-11/12" />
        <Kostra className="h-3 w-3/4" />
        <Kostra className="mt-6 h-40 w-full rounded-xl" />
      </div>
    </KostraObal>
  );
}
