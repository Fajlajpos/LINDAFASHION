import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/** Stránka je `force-dynamic`, takže bez kostry ji `<Link>` nedokáže přednačíst. */
export default function NacitaniZmenyEmailu() {
  return (
    <KostraObal
      popisek="Načítám potvrzení změny e-mailu…"
      className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <Kostra className="h-3 w-24" />
        <Kostra className="h-10 w-64 max-w-full" />
      </div>

      <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <Kostra className="h-6 w-56 max-w-full" />
        <Kostra className="h-4 w-full" />
        <Kostra className="h-4 w-4/5" />
        <Kostra className="h-11 w-56 max-w-full rounded-full" />
      </div>
    </KostraObal>
  );
}
