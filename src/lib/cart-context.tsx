'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CartItemType } from './types';
import { nacist, poslatJson } from './api-klient';

/**
 * Košík.
 *
 * Nepřihlášená zákaznice ho má jen v prohlížeči (localStorage), jak je běžné.
 * Jakmile je přihlášená, obsah se navíc ukládá u účtu – přežije odhlášení
 * i přechod na jiné zařízení, a při přihlášení se oba košíky **sloučí**
 * (sekce 5 zadání).
 *
 * Server je při přihlášení zdrojem pravdy o dostupnosti: co mezitím zmizelo
 * z nabídky nebo se vyprodalo, z košíku odejde a zákaznice se to dozví hned,
 * ne až u pokladny.
 */

interface OdebranaPolozka {
  nazev: string;
  duvod: string;
}

interface CartContextType {
  cart: CartItemType[];
  addToCart: (item: CartItemType) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, mnozstvi: number) => void;
  clearCart: () => void;
  totalCartValue: number;
  totalItemCount: number;
  /** Položky, které server odebral kvůli nedostupnosti – k zobrazení v košíku. */
  odebranePolozky: OdebranaPolozka[];
  potvrditOdebrani: () => void;
  /** Než doběhne první synchronizace, košík ještě nemusí být úplný. */
  synchronizuje: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const KLIC = 'linda_cart';

interface OdpovedKosiku {
  prihlasen: boolean;
  polozky: Array<{
    variantId: string;
    productId: string;
    nazev: string;
    slug: string;
    velikost: string;
    barva: string | null;
    cena: number;
    cenaPoSleve: number | null;
    mnozstvi: number;
    obrazekUrl: string | null;
    skladem: number;
  }>;
  odebrano?: OdebranaPolozka[];
}

export const CartProvider: React.FC<{ children: React.ReactNode; prihlasen?: boolean }> = ({
  children,
  prihlasen = false,
}) => {
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [odebranePolozky, setOdebranePolozky] = useState<OdebranaPolozka[]>([]);
  const [synchronizuje, setSynchronizuje] = useState(prihlasen);

  /* Pojistka proti přepsání: bez ní zápisový efekt proběhne hned po prvním
     renderu s prázdným polem a smaže uložený košík dřív, než se stihne
     projevit ten načtený. */
  const [nacteno, setNacteno] = useState(false);

  // Načtení z prohlížeče.
  useEffect(() => {
    const ulozene = localStorage.getItem(KLIC);

    if (ulozene) {
      try {
        const data: unknown = JSON.parse(ulozene);
        if (Array.isArray(data)) setCart(data as CartItemType[]);
      } catch (e) {
        console.error('Chyba načtení košíku z localStorage:', e);
      }
    }

    setNacteno(true);
  }, []);

  // Zápis do prohlížeče – i přihlášená zákaznice ho má, aby košík byl
  // okamžitě po ruce ještě před odpovědí serveru.
  useEffect(() => {
    if (!nacteno) return;
    localStorage.setItem(KLIC, JSON.stringify(cart));
  }, [cart, nacteno]);

  /** Sloučení s košíkem u účtu. Běží jednou po přihlášení. */
  const sloucitSeServerem = useCallback(async (mistni: CartItemType[]) => {
    const vysledek = await poslatJson<OdpovedKosiku>('/api/kosik', {
      polozky: mistni.map((p) => ({ variantId: p.variantId, mnozstvi: p.mnozstvi })),
    });

    if (!vysledek.ok) {
      setSynchronizuje(false);
      return;
    }

    setCart(vysledek.data.polozky);
    setOdebranePolozky(vysledek.data.odebrano ?? []);
    setSynchronizuje(false);
  }, []);

  const uzSlouceno = useRef(false);

  useEffect(() => {
    if (!nacteno) return;

    if (!prihlasen) {
      // Odhlášení: košík zůstává v prohlížeči, jen zapomeneme, že už proběhlo
      // sloučení – po dalším přihlášení se má provést znovu.
      uzSlouceno.current = false;
      setSynchronizuje(false);
      return;
    }

    if (uzSlouceno.current) return;
    uzSlouceno.current = true;
    setSynchronizuje(true);

    void sloucitSeServerem(cart);
    // `cart` schválně není v závislostech – sloučení se má spustit jednou
    // po přihlášení, ne při každé změně košíku.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prihlasen, nacteno, sloucitSeServerem]);

  /** Změna množství na serveru; u nepřihlášené zákaznice se neděje nic. */
  const synchronizovatPolozku = useCallback(
    (variantId: string, mnozstvi: number) => {
      if (!prihlasen) return;

      void poslatJson('/api/kosik', { variantId, mnozstvi }, 'PATCH');
    },
    [prihlasen]
  );

  const addToCart = (item: CartItemType) => {
    setCart((prev) => {
      const stavajici = prev.find((i) => i.variantId === item.variantId);

      // Nikdy víc, než kolik je skladem – jinak by objednávka spadla až
      // v pokladně.
      const noveMnozstvi = Math.min(
        (stavajici?.mnozstvi ?? 0) + item.mnozstvi,
        item.skladem || Number.MAX_SAFE_INTEGER
      );

      synchronizovatPolozku(item.variantId, noveMnozstvi);

      if (stavajici) {
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, mnozstvi: noveMnozstvi } : i));
      }

      return [...prev, { ...item, mnozstvi: noveMnozstvi }];
    });
  };

  const removeFromCart = (variantId: string) => {
    synchronizovatPolozku(variantId, 0);
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, mnozstvi: number) => {
    if (mnozstvi <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart((prev) =>
      prev.map((i) => {
        if (i.variantId !== variantId) return i;

        const omezene = Math.min(mnozstvi, i.skladem || Number.MAX_SAFE_INTEGER);
        synchronizovatPolozku(variantId, omezene);
        return { ...i, mnozstvi: omezene };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    if (prihlasen) void poslatJson('/api/kosik', undefined, 'DELETE');
  };

  const totalCartValue = cart.reduce(
    (sum, item) => sum + (item.cenaPoSleve || item.cena) * item.mnozstvi,
    0
  );

  const totalItemCount = cart.reduce((sum, item) => sum + item.mnozstvi, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCartValue,
        totalItemCount,
        odebranePolozky,
        potvrditOdebrani: () => setOdebranePolozky([]),
        synchronizuje,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart musí být použit uvnitř CartProvider');
  }
  return context;
};

/** Načtení košíku ze serveru mimo provider (např. pro pokladnu). */
export async function nacistKosikZeServeru() {
  return nacist<OdpovedKosiku>('/api/kosik');
}
