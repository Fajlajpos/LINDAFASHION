import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra registračního formuláře.
 *
 * Stránka je `force-dynamic` (kvůli klíči captchy), a takové stránky bez
 * `loading.tsx` nejdou předběžně načíst: `<Link>` prefetch dojede nanejvýš
 * k nejbližší hranici načítání, takže bez ní je každý proklik studená cesta
 * na server a mezitím drží stará stránka.
 *
 * Rozměry kopírují hotový formulář (`max-w-md`, zaoblená karta, pole po
 * 44 px), aby po načtení nic neposkočilo.
 */
export default function NacitaniRegistrace() {
  return (
    <KostraObal
      popisek="Načítám registraci…"
      className="flex min-h-[80vh] items-center justify-center bg-linda-cream px-4 py-12"
    >
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-linda-cream p-8 shadow-neuLg sm:p-10">
        <div className="space-y-2">
          <Kostra className="mx-auto h-6 w-48" />
          <Kostra className="mx-auto h-8 w-64 max-w-full" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Kostra key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>

        <div className="space-y-3">
          <Kostra className="h-4 w-full" />
          <Kostra className="h-4 w-5/6" />
        </div>

        <Kostra className="h-11 w-full rounded-full" />
      </div>
    </KostraObal>
  );
}
