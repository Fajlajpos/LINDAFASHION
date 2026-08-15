import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra detailu produktu – galerie vlevo, výběr velikosti vpravo.
 *
 * Proporce fotky (3:4) tu jsou schválně stejné jako na hotové stránce: je to
 * největší plocha na obrazovce a kdyby se po načtení změnila, posunula by
 * celý zbytek (CLS).
 */
export default function NacitaniDetailu() {
  return (
    <KostraObal
      popisek="Načítám produkt…"
      className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8"
    >
      <Kostra className="h-3 w-72 max-w-full" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Galerie */}
        <div className="space-y-4">
          <Kostra className="aspect-[3/4] w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Kostra key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Údaje a výběr velikosti */}
        <div className="space-y-6">
          <Kostra className="h-3 w-28" />
          <Kostra className="h-10 w-4/5" />
          <Kostra className="h-8 w-40" />
          <div className="space-y-2">
            <Kostra className="h-3 w-full" />
            <Kostra className="h-3 w-full" />
            <Kostra className="h-3 w-2/3" />
          </div>

          <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
            <Kostra className="h-3 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Kostra key={i} className="h-11 w-16" />
              ))}
            </div>
            <Kostra className="h-11 w-full rounded-full" />
          </div>
        </div>
      </div>
    </KostraObal>
  );
}
