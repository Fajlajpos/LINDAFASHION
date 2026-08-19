import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Undo2, Wrench } from 'lucide-react';
import { ReklamaceFormular } from '@/components/shop/ReklamaceFormular';
import { nacistNastaveni } from '@/lib/nastaveni';
import { DNU_NA_ODSTOUPENI, DNU_NA_REKLAMACI } from '@/lib/lhuty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reklamace | LINDA FASHION',
  description:
    'Uplatněte reklamaci vady i bez přihlášení – stačí číslo objednávky a e-mail. Vyřídíme ji do 30 dnů.',
  alternates: { canonical: '/reklamace' },
};

/**
 * Uplatnění reklamace bez přihlášení.
 *
 * Formulář v účtu zůstává a je pohodlnější (vidí i stav starších žádostí),
 * jenže objednávka bez registrace žádný účet nemá – a práva z vadného plnění
 * na registraci nezávisí. Tahle stránka je proto ta cesta, která platí pro
 * všechny; účet je zkratka pro ty, kdo ho mají.
 */
export default async function ReklamacePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const nastaveni = await nacistNastaveni();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          Vada zboží
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Reklamace</h1>
        <p className="max-w-2xl text-xs leading-relaxed text-linda-espresso/75">
          Něco se rozpáralo, pustilo barvu nebo dorazilo poškozené? Reklamaci můžete uplatnit do
          dvou let od převzetí a vyřídíme ji nejpozději do {DNU_NA_REKLAMACI} dnů. Přihlašovat se
          nemusíte.
        </p>
      </header>

      <ReklamaceFormular tokenZOdkazu={searchParams.token} />

      <section className="space-y-3 rounded-2xl bg-linda-cream p-6 shadow-neuSm">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-linda-espresso">
          <Undo2 className="h-4 w-4 text-linda-cognac" aria-hidden="true" />
          Zboží není vadné, jen vám nesedlo?
        </h2>
        <p className="text-xs leading-relaxed text-linda-espresso/75">
          Pak nejde o reklamaci, ale o odstoupení od smlouvy – to jde do {DNU_NA_ODSTOUPENI} dnů od
          převzetí, bez udání důvodu a bez sankce.{' '}
          <Link
            href="/odstoupeni"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            Odstoupit od smlouvy
          </Link>
          .
        </p>
        <p className="text-xs leading-relaxed text-linda-espresso/75">
          Podrobnosti k oběma cestám najdete v{' '}
          <Link
            href="/reklamacni-rad"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            reklamačním řádu
          </Link>
          . Máte-li u nás účet, uvidíte stav žádosti v{' '}
          <Link
            href="/muj-ucet"
            className="font-semibold text-linda-cognac underline underline-offset-2"
          >
            mém účtu
          </Link>
          .
          {nastaveni.adresaProVraceni && (
            <>
              {' '}
              Zboží posílejte na adresu{' '}
              <strong className="font-semibold">{nastaveni.adresaProVraceni}</strong>, ale až po
              naší odpovědi.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
