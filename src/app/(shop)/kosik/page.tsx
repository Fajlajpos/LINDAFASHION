import React from 'react';
import type { Metadata } from 'next';
import { KosikObsah } from '@/components/shop/KosikObsah';
import { nacistNastaveni, popisDph } from '@/lib/nastaveni';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nákupní košík | LINDA FASHION',
  robots: { index: false, follow: false },
};

/**
 * Košík.
 *
 * Server sem dodá jen práh dopravy zdarma z administrace – zbytek žije
 * v prohlížeči, protože nepřihlášená zákaznice má košík jen tam.
 * Dřív byl práh napsaný natvrdo na 2 500 Kč, takže se rozcházel s pokladnou.
 */
export default async function KosikPage() {
  const nastaveni = await nacistNastaveni();

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-4xl text-linda-espresso">Nákupní košík</h1>
      </div>

      <KosikObsah
        prahDopravaZdarma={nastaveni.prahDopravaZdarma}
        popisDph={popisDph(nastaveni)}
      />
    </div>
  );
}
