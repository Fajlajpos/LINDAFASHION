'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { Vyber } from '@/components/ui/Vyber';
import type { Razeni } from '@/lib/katalog';

const MOZNOSTI: Array<{ hodnota: Razeni; popisek: string }> = [
  { hodnota: 'nejnovejsi', popisek: 'Nejnovější' },
  { hodnota: 'cena-vzestupne', popisek: 'Cena: od nejlevnějšího' },
  { hodnota: 'cena-sestupne', popisek: 'Cena: od nejdražšího' },
  { hodnota: 'nazev', popisek: 'Podle názvu' },
];

/**
 * Řazení katalogu (sekce 14). Volba se promítá do URL, aby šla stránka
 * sdílet a fungovalo tlačítko zpět.
 */
export function RazeniKatalogu({ aktualni }: { aktualni: Razeni }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const zmenit = (hodnota: string) => {
    const parametry = new URLSearchParams(searchParams.toString());

    if (hodnota === 'nejnovejsi') parametry.delete('razeni');
    else parametry.set('razeni', hodnota);

    // Změna řazení vrací na první stránku – jinak by zákaznice zůstala
    // na stránce 3 jiného pořadí.
    parametry.delete('stranka');

    const dotaz = parametry.toString();
    router.push(dotaz ? `${pathname}?${dotaz}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <Vyber
        id="razeni"
        varianta="vystouply"
        ariaLabel="Řazení produktů"
        hodnota={aktualni}
        moznosti={MOZNOSTI}
        onZmena={zmenit}
        ikona={
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-linda-cognac" aria-hidden="true" />
        }
        trida="min-w-[13.5rem]"
      />
    </div>
  );
}
