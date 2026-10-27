import React from 'react';
import type { Metadata } from 'next';
import { KosikObsah } from '@/components/shop/KosikObsah';
import { jeNastaveno } from '@/lib/gopay';
import { nacistNastaveni, popisDodaciLhuty, popisDph } from '@/lib/nastaveni';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nákupní košík | LINDA FASHION',
  robots: { index: false, follow: false },
};

/**
 * Košík – první krok objednávky.
 *
 * Krokovač pokladny tu schválně není (majitelka, 2026-10): v košíku si
 * zákaznice teprve prohlíží, co vybrala, a „Košík › Údaje › Doprava…"
 * nad tím působilo, jako by už objednávala. Ukazuje se až od kroku Údaje.
 *
 * Server sem dodá jen práh dopravy zdarma z administrace a to, čím lze
 * platit – zbytek žije v prohlížeči, protože nepřihlášená zákaznice má košík
 * jen tam. Dřív byl práh napsaný natvrdo na 2 500 Kč, takže se rozcházel
 * s pokladnou.
 */
export default async function KosikPage() {
  const nastaveni = await nacistNastaveni();

  // Stejné podmínky jako v pokladně: karta jen se zapojenou bránou.
  const platebniProstredky = [
    'bankovním převodem',
    ...(jeNastaveno() ? ['kartou přes platební bránu GoPay'] : []),
    'dárkovým poukazem',
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Nákupní košík</h1>
      </div>

      <KosikObsah
        prahDopravaZdarma={nastaveni.prahDopravaZdarma}
        popisDph={popisDph(nastaveni)}
        platebniProstredky={platebniProstredky}
        dodaciLhuta={popisDodaciLhuty(nastaveni)}
      />
    </div>
  );
}
