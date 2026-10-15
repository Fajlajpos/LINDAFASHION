'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { KROKY } from '@/lib/pokladna-kroky';
import { KrokyPokladny } from './KrokyPokladny';

/**
 * Nadpis a krokovač kroků 2–4 podle adresy.
 *
 * Layout se mezi kroky nepřekresluje ze serveru, takže to, který krok je
 * aktivní, musí zjistit klient z cesty. Nadpis stránky je název kroku –
 * čtečka obrazovky po přechodu ohlásí, kde zákaznice je, ne jen „Pokladna".
 */
export function AktivniKrok() {
  const cesta = usePathname();
  const krok = KROKY.find((k) => k.href === cesta && k.cislo > 1) ?? KROKY[1];

  return (
    <>
      <h1 className="font-serif text-4xl text-linda-espresso">{krok.nazev}</h1>
      <KrokyPokladny aktivni={krok.cislo} />
    </>
  );
}
