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
        <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#2B2019] selection:bg-[#7A4B32] selection:text-white">
          <Header />
          <main className="flex-1">{children}</main>
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
