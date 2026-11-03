import React from 'react';
import type { Metadata } from 'next';
import { MailCheck } from 'lucide-react';
import { PotvrzeniOvereniEmailu } from '@/components/shop/PotvrzeniOvereniEmailu';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ověření e-mailu | LINDA FASHION',
  robots: { index: false, follow: false },
};

/**
 * Cíl odkazu z ověřovacího e-mailu po registraci.
 *
 * Stránka sama nic nemění – ověření odešle až tlačítko (POST). Prosté
 * otevření adresy by jinak provedl náhledový robot poštovního klienta.
 *
 * Leží mimo `/muj-ucet` ze stejného důvodu jako `/zmena-emailu`: odkaz se
 * otevírá z pošty, klidně v prohlížeči, kde přihlášená není, a middleware by
 * ji pod `/muj-ucet` poslal na přihlašovací formulář.
 */
export default function OvereniEmailuPage({ searchParams }: { searchParams: { t?: string } }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Váš účet
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Ověření e-mailu</h1>
      </header>

      <PotvrzeniOvereniEmailu token={searchParams.t ?? null} />
    </div>
  );
}
