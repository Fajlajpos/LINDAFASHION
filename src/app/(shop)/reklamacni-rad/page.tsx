import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PravniText } from '@/components/shop/PravniText';
import { nacistZneni } from '@/lib/pravni-dokumenty';
import { nacistNastaveni } from '@/lib/nastaveni';
import { DNU_NA_ODSTOUPENI, DNU_NA_REKLAMACI } from '@/lib/lhuty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reklamační řád | LINDA FASHION',
  description:
    'Jak uplatnit reklamaci, jaké máte lhůty a práva z vadného plnění, a čím se liší reklamace od vrácení zboží do 14 dnů.',
  alternates: { canonical: '/reklamacni-rad' },
};

/**
 * Reklamační řád.
 *
 * Stejně jako obchodní podmínky se čte z databáze – je to nedílná součást
 * podmínek a musí jít doložit ve stejném znění, jaké platilo v době nákupu.
 *
 * Rozcestník dole je tu proto, že si zákaznice reklamaci a odstoupení plete
 * skoro vždycky, a jsou to dvě různá práva s různými lhůtami a různým
 * postupem. Vrácení „protože mi to nesedlo" není reklamace.
 */
export default async function ReklamacniRadPage() {
  const [zneni, nastaveni] = await Promise.all([
    nacistZneni('reklamacni-rad'),
    nacistNastaveni(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-2 border-b border-linda-sand pb-8">
        <h1 className="font-serif text-4xl text-linda-espresso">{zneni.nadpis}</h1>
        <p className="text-xs text-linda-espresso/70">
          Verze <strong className="font-semibold">{zneni.verze}</strong>
          {zneni.zDatabaze && <> · účinné od {zneni.ucinnostOd.toLocaleDateString('cs-CZ')}</>}
        </p>
      </header>

      <article className="rounded-2xl bg-linda-cream p-6 shadow-neu sm:p-8">
        <PravniText obsah={zneni.obsah} />
      </article>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neuSm">
          <h2 className="font-serif text-lg text-linda-espresso">Zboží je vadné</h2>
          <p className="text-xs leading-relaxed text-linda-espresso/85">
            Reklamaci uplatníte v zákaznickém účtu u konkrétní objednávky. Vyřídíme ji do{' '}
            {DNU_NA_REKLAMACI} dnů.
          </p>
          <Link
            href="/muj-ucet"
            className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cream px-5 text-xs font-semibold text-linda-espresso shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm"
          >
            Uplatnit reklamaci
          </Link>
        </div>

        <div className="space-y-2 rounded-2xl bg-linda-cream p-6 shadow-neuSm">
          <h2 className="font-serif text-lg text-linda-espresso">Jen mi to nesedlo</h2>
          <p className="text-xs leading-relaxed text-linda-espresso/85">
            Do {DNU_NA_ODSTOUPENI} dnů od převzetí můžete odstoupit od smlouvy bez udání důvodu.
            Přihlašovat se nemusíte.
          </p>
          <Link
            href="/odstoupeni"
            className="inline-flex min-h-touch cursor-pointer items-center rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
          >
            Odstoupit od smlouvy
          </Link>
        </div>
      </section>

      {nastaveni.adresaProVraceni && (
        <p className="rounded-xl bg-linda-sandLight p-4 text-xs leading-relaxed text-linda-espresso/85 shadow-neuInsetSm">
          <strong className="font-semibold">Adresa pro vrácené a reklamované zboží:</strong>{' '}
          {nastaveni.adresaProVraceni}
        </p>
      )}
    </div>
  );
}
