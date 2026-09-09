import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { StavReklamace } from '@/components/shop/StavReklamace';
import { DNU_NA_REKLAMACI } from '@/lib/lhuty';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Stav reklamace | LINDA FASHION',
  description:
    'Zjistěte, jak pokračuje vaše reklamace nebo vrácení zboží – stačí číslo objednávky a e-mail, přihlášení není potřeba.',
  alternates: { canonical: '/reklamace/stav' },
};

/**
 * Stav reklamace bez přihlášení.
 *
 * `Reklamace.token` se generoval ke každé žádosti od začátku a schéma u něj
 * má napsané „přístup k detailu přes token, ne přes přihlášení“ – jenže ho
 * do téhle chvíle nikdo nečetl. Zákaznice bez účtu tak neměla jak zjistit,
 * co se s žádostí děje; jediná zpráva dorazila až na konci, e-mailem
 * o vyřízení. Přihlášená to viděla v účtu, nepřihlášená nikde – a právo
 * reklamovat na registraci nezávisí.
 *
 * Parametr se jmenuje `t`, ne `token`: stejně jako u potvrzení objednávky.
 * Dvě různá pojmenování téhož znamenají, že jeden z odkazů jednou povede
 * na prázdnou stránku.
 */
export default function StavReklamacePage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Vaše žádost
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Stav reklamace</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-linda-espresso/80">
          Podívejte se, jak pokračuje vaše reklamace nebo vrácení zboží. Přihlášení není potřeba –
          stačí číslo objednávky a e-mail, který jste u ní použila. Vyřídíme ji nejpozději do{' '}
          {DNU_NA_REKLAMACI} dnů od uplatnění.
        </p>
      </header>

      <StavReklamace token={searchParams.t ?? null} />

      <p className="text-xs text-linda-espresso/70">
        Ještě jste žádost nepodala?{' '}
        <Link href="/reklamace" className="font-semibold text-linda-cognac underline">
          Uplatnit reklamaci
        </Link>
        . Podmínky najdete v{' '}
        <Link href="/reklamacni-rad" className="font-semibold text-linda-cognac underline">
          reklamačním řádu
        </Link>
        .
      </p>
    </div>
  );
}
