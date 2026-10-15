import React from 'react';
import { Kostra } from '@/components/ui/Kostra';
import { NacitaniKroku } from '@/components/shop/pokladna/NacitaniKroku';

/**
 * Kostra pokladny při příchodu z košíku.
 *
 * Layout kroků načítá nastavení, účet a adresy, takže první vstup chvíli
 * trvá. Bez vlastní kostry by se ukázala obecná kostra obchodu s jiným
 * rozvržením a stránka by po načtení poskočila.
 */
export default function NacitaniPokladny() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="space-y-5 border-b border-linda-sand pb-6">
        <Kostra className="h-10 w-64" />
        <Kostra className="h-8 w-full max-w-xl" />
      </div>
      <NacitaniKroku />
    </div>
  );
}
