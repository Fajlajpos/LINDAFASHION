import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra stránky se stavem reklamace.
 *
 * Stránka je `force-dynamic`, a taková bez `loading.tsx` nejde předběžně
 * načíst – prefetch `<Link>` dojede nanejvýš k nejbližší hranici načítání.
 * Bez ní by po kliknutí držela stará stránka, dokud server neodpoví.
 */
export default function NacitaniStavuReklamace() {
  return (
    <KostraObal
      popisek="Načítám stav reklamace…"
      className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <Kostra className="h-3 w-32" />
        <Kostra className="h-10 w-72 max-w-full" />
        <Kostra className="h-4 w-full max-w-2xl" />
      </div>

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
        <Kostra className="h-6 w-64 max-w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Kostra className="h-11 w-full rounded-xl" />
          <Kostra className="h-11 w-full rounded-xl" />
        </div>
        <Kostra className="h-11 w-40 rounded-full" />
      </div>
    </KostraObal>
  );
}
