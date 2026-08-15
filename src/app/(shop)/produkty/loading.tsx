import React from 'react';
import { Kostra, KostraMrizky, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra katalogu – platí pro `/produkty` i pro `/produkty/[kategorie]`.
 *
 * Bez `loading.tsx` neměl App Router při přechodu co ukázat: stará stránka
 * zůstala na obrazovce a nic se nedělo, dokud server nedorendroval celou
 * novou. U `force-dynamic` stránky se tím navíc znehodnotil `prefetch` –
 * `<Link>` přednačítá právě jen po nejbližší hranici načítání, a když žádná
 * není, nemá co si odložit dopředu a každé kliknutí jde na server nastudena.
 *
 * Rozvržení kopíruje `KatalogVypis` (boční panel + mřížka 3 sloupců), aby
 * obsah po dorenderování naskočil na stejné místo a stránka neposkočila.
 */
export default function NacitaniKatalogu() {
  return (
    <KostraObal
      popisek="Načítám katalog…"
      className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-3 border-b border-linda-sand pb-8">
        <Kostra className="h-3 w-40" />
        <Kostra className="h-11 w-2/3 max-w-lg sm:h-12" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside>
          <div className="space-y-4 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <div className="border-b border-linda-sand/60 pb-3">
              <Kostra className="h-6 w-32" />
            </div>
            {Array.from({ length: 6 }, (_, i) => (
              <Kostra key={i} className="h-11 w-full" />
            ))}
          </div>
        </aside>

        <div className="space-y-6 lg:col-span-3">
          <Kostra className="h-14 w-full rounded-xl" />
          <KostraMrizky pocet={6} />
        </div>
      </div>
    </KostraObal>
  );
}
