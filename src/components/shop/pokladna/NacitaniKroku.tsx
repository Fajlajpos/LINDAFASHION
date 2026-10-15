import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra kroku pokladny – formulář vlevo, souhrn vpravo.
 *
 * Ukazuje ji `loading.tsx` při příchodu z košíku i samotný krok, dokud se
 * nenačte košík z prohlížeče. Tvar je stejný jako hotový krok, takže se po
 * načtení nic neposune.
 */
export function NacitaniKroku({ popisek = 'Načítám pokladnu…' }: { popisek?: string }) {
  return (
    <KostraObal popisek={popisek} className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
            <Kostra className="h-6 w-40" />
            <Kostra className="h-16 w-full rounded-xl" />
            <Kostra className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="lg:col-span-5">
        <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
          <Kostra className="h-6 w-32" />
          <Kostra className="h-14 w-full rounded-xl" />
          <Kostra className="h-3 w-full" />
          <Kostra className="h-3 w-2/3" />
          <Kostra className="h-8 w-full rounded-xl" />
        </div>
      </div>
    </KostraObal>
  );
}
