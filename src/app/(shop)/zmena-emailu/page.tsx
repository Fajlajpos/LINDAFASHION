import React from 'react';
import type { Metadata } from 'next';
import { MailCheck } from 'lucide-react';
import { PotvrzeniZmenyEmailu } from '@/components/shop/PotvrzeniZmenyEmailu';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Potvrzení nové e-mailové adresy | LINDA FASHION',
  robots: { index: false, follow: false },
};

/**
 * Cíl odkazu z potvrzovacího e-mailu (čl. 16 GDPR – právo na opravu).
 *
 * Stránka sama nic nemění – jen ukáže tlačítko, které změnu odešle POSTem.
 * Kdyby ji dokončilo prosté otevření adresy, provedl by ji náhledový robot
 * poštovního klienta dřív, než si zákaznice zprávu přečte.
 *
 * **Leží mimo `/muj-ucet`, a to je podstatné.** Tamtu větev hlídá middleware
 * (`PRIHLASENE_CESTY`), jenže potvrzení přichází z nové schránky – klidně na
 * jiném zařízení, kde zákaznice přihlášená není. Pod `/muj-ucet` by ji odkaz
 * z e-mailu poslal na přihlašovací formulář, do kterého se novou adresou
 * ještě přihlásit nedá. Stejný důvod, proč je mimo i `/obnova-hesla`.
 *
 * Důkazem je token, ne session. `robots: noindex` proto, že adresa nese
 * jednorázový klíč.
 */
export default function ZmenaEmailuPage({ searchParams }: { searchParams: { t?: string } }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3 border-b border-linda-sand pb-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-cognac">
          <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Váš účet
        </p>
        <h1 className="font-serif text-4xl text-linda-espresso">Změna e-mailu</h1>
      </header>

      <PotvrzeniZmenyEmailu token={searchParams.t ?? null} />
    </div>
  );
}
