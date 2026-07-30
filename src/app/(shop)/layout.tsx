'use client';

import React, { useState } from 'react';
import { Header } from '@/components/shop/Header';
import { Footer } from '@/components/shop/Footer';
import { CookieBanner } from '@/components/shop/CookieBanner';
import { CartProvider } from '@/lib/cart-context';
import { FavoritesProvider } from '@/lib/favorites-context';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  return (
    <CartProvider>
      <FavoritesProvider>
        <div className="min-h-screen flex flex-col bg-linda-cream text-linda-espresso selection:bg-linda-cognac selection:text-white">
          <Header />
          <main id="obsah" className="flex-1">{children}</main>
          <Footer onOpenCookieSettings={() => setCookieSettingsOpen(true)} />
          <CookieBanner
            isOpenExternal={cookieSettingsOpen}
            onCloseExternal={() => setCookieSettingsOpen(false)}
          />
        </div>
      </FavoritesProvider>
    </CartProvider>
  );
}
