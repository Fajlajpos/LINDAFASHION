import React from 'react';
import { Kostra, KostraObal } from '@/components/ui/Kostra';

/**
 * Kostra administrace. Všechny admin stránky jsou `force-dynamic` a většina
 * z nich je tabulka nad databází – tvar je proto pokaždé stejný: nadpis,
 * pruh s počty, řádky.
 */
export default function NacitaniAdministrace() {
  return (
    <KostraObal popisek="Načítám administraci…" className="space-y-6">
      <div className="space-y-3">
        <Kostra className="h-8 w-64" />
        <Kostra className="h-3 w-80 max-w-full" />
      </div>

      <div className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neu">
        {Array.from({ length: 8 }, (_, i) => (
          <Kostra key={i} className="h-12 w-full" />
        ))}
      </div>
    </KostraObal>
  );
}
