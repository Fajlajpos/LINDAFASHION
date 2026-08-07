import React from 'react';
import { Header } from '@/components/shop/Header';
import { ShopProviders } from '@/components/shop/ShopProviders';
import { JsonLd } from '@/components/shop/JsonLd';
import { getSession } from '@/lib/auth';
import { nacistNastaveni, zpravaODovolene } from '@/lib/nastaveni';
import { mistniProvozovnaLd, organizaceLd } from '@/lib/strukturovana-data';

/**
 * Layout obchodu je Server Component, aby si mohl přečíst přihlášenou
 * zákaznici a nastavení e-shopu. Interaktivní část (košík, oblíbené, lišta
 * cookies) je vyčleněná do `ShopProviders`.
 *
 * Session tu čteme přes `getSession()`, tedy jen z tokenu bez dotazu do
 * databáze – jde o zobrazení jména v hlavičce, ne o oprávnění. Kde na
 * oprávnění záleží, se používá `overitUzivatele()`.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [session, nastaveni] = await Promise.all([getSession(), nacistNastaveni()]);

  const zprava = zpravaODovolene(nastaveni);

  return (
    <ShopProviders
      socialInstagram={nastaveni.socialInstagram}
      socialFacebook={nastaveni.socialFacebook}
      prihlasen={session !== null}
    >
      {/* Bez vlastního pozadí – zem stránky (`linda-paper` + zrno) drží `body`
          v globals.css. Dokud tu bylo `bg-linda-cream`, přebilo ji to na celém
          obchodě a reliéf neměl proti čemu vystoupit. */}
      {/* Strukturovaná data platná pro celý obchod (sekce 12). LocalBusiness
          se vykreslí, teprve až majitelka vyplní adresu v administraci. */}
      <JsonLd data={organizaceLd(nastaveni)} />
      <JsonLd data={mistniProvozovnaLd(nastaveni)} />

      <div className="flex min-h-screen flex-col text-linda-espresso selection:bg-linda-cognac selection:text-white">
        <Header
          user={session ? { jmeno: session.jmeno, email: session.email } : null}
          vacationMode={{ active: nastaveni.rezimDovolene, message: zprava }}
        />
        <main id="obsah" className="flex-1">
          {children}
        </main>
      </div>
    </ShopProviders>
  );
}
