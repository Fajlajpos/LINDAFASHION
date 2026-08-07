'use client';

import React, { useState } from 'react';
import { Footer } from '@/components/shop/Footer';
import { CookieBanner } from '@/components/shop/CookieBanner';
import { AnalytickeSkripty } from '@/components/shop/AnalytickeSkripty';
import { CartProvider } from '@/lib/cart-context';
import { FavoritesProvider } from '@/lib/favorites-context';

interface Props {
  children: React.ReactNode;
  /** Odkazy na sociální sítě z administrace (sekce 6.8). */
  socialInstagram?: string | null;
  socialFacebook?: string | null;
  /**
   * Přihlášené zákaznici se košík i oblíbené synchronizují s účtem.
   * Klientské kontexty samy o přihlášení nevědí, dostanou to z layoutu.
   */
  prihlasen?: boolean;
}

/**
 * Klientská část obalu obchodu.
 *
 * Původně byl celý `(shop)/layout.tsx` označený `'use client'` jen kvůli
 * jednomu `useState` pro otevření nastavení cookies. Tím pádem layout nemohl
 * číst session ani nastavení ze serveru – a proto hlavička nikdy nedostala
 * přihlášenou zákaznici ani banner dovolené.
 *
 * Interaktivita zůstala tady, layout je znovu Server Component.
 */
export function ShopProviders({
  children,
  socialInstagram,
  socialFacebook,
  prihlasen = false,
}: Props) {
  const [nastaveniCookiesOtevreno, setNastaveniCookiesOtevreno] = useState(false);

  return (
    <CartProvider prihlasen={prihlasen}>
      <FavoritesProvider prihlasen={prihlasen}>
        {children}

        <Footer
          onOpenCookieSettings={() => setNastaveniCookiesOtevreno(true)}
          socialInstagram={socialInstagram}
          socialFacebook={socialFacebook}
        />

        <CookieBanner
          isOpenExternal={nastaveniCookiesOtevreno}
          onCloseExternal={() => setNastaveniCookiesOtevreno(false)}
        />

        {/* Měřicí skripty se načtou až po souhlasu – viz AnalytickeSkripty. */}
        <AnalytickeSkripty />
      </FavoritesProvider>
    </CartProvider>
  );
}
