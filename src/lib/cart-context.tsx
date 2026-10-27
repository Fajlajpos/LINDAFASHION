'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CartItemType } from './types';
import { nacist, poslatJson, type Vysledek } from './api-klient';
import { nacistUlozeny, priNavratuNaStranku, ulozit } from './ucet-uloziste';
import { zapomenoutKody } from './ulozene-kody';
import { zapomenoutKoncept } from './pokladna-uloziste';

/**
 * Košík.
 *
 * Nepřihlášená zákaznice ho má jen v prohlížeči (localStorage), jak je běžné.
 * Jakmile je přihlášená, zdrojem pravdy je košík u účtu – přežije odhlášení
 * i přechod na jiné zařízení. Košík hosta se s ním při přihlášení **jednou
 * sloučí** (sekce 5 zadání); prohlížeč pak drží jen kopii účtu, která se
 * obnovuje při každém návratu na stránku (viz ucet-uloziste.ts).
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
  /**
   * Košík už je načtený z prohlížeče.
   *
   * Do té chvíle je `cart` prázdný jen proto, že `localStorage` se čte až
   * v efektu – stránka, která by podle něj hlásila „Košík je prázdný“, by to
   * nepřihlášené zákaznici na okamžik ukázala i s plným košíkem.
   */
  nacteno: boolean;
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
    nejnizsiCena30DniHaleru: number | null;
    mnozstvi: number;
    obrazekUrl: string | null;
    skladem: number;
  }>;
  odebrano?: OdebranaPolozka[];
}

const jePolozka = (p: unknown): p is CartItemType =>
  typeof p === 'object' &&
  p !== null &&
  typeof (p as CartItemType).variantId === 'string' &&
  typeof (p as CartItemType).mnozstvi === 'number';

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
  /** `true` = košík v prohlížeči je kopie účtu a nikdy se neslučuje (viz ucet-uloziste.ts). */
  const [ucet, setUcet] = useState(false);

  const cartRef = useRef(cart);
  cartRef.current = cart;
  const ucetRef = useRef(ucet);
  ucetRef.current = ucet;

  /* Pořadové číslo dotazu: použije se jen odpověď nejnovějšího. Tři rychlá
     plus pošlou tři PATCHe a starší odpovědi by jinak množství vracely zpět;
     obnovení po návratu na stránku by zase přepsalo právě přidaný kousek. */
  const posledniDotaz = useRef(0);

  const synchronizovat = useCallback(async (dotaz: () => Promise<Vysledek<OdpovedKosiku>>) => {
    const cislo = ++posledniDotaz.current;
    const vysledek = await dotaz();
    if (cislo !== posledniDotaz.current) return vysledek;

    if (vysledek.ok) {
      setCart(vysledek.data.polozky);
      if (vysledek.data.odebrano?.length) setOdebranePolozky(vysledek.data.odebrano);
      setUcet(vysledek.data.prihlasen);
    }
    // Nedostupný server není důvod zákaznici vyprázdnit košík.
    setSynchronizuje(false);
    return vysledek;
  }, []);

  // Načtení z prohlížeče.
  useEffect(() => {
    const ulozeny = nacistUlozeny(KLIC, jePolozka);
    // Kopie účtu bez přihlášení (odhlášení, vypršelé přihlášení) se nenačte –
    // byl by to cizí košík pro toho, kdo je teď u prohlížeče.
    if (!ulozeny.ucet || prihlasen) {
      setCart(ulozeny.polozky);
      setUcet(ulozeny.ucet);
    }
    setNacteno(true);
    // Čte se jednou; změny přihlášení řeší efekt níž.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zápis do prohlížeče – i přihlášená zákaznice ho má, aby košík byl
  // okamžitě po ruce ještě před odpovědí serveru.
  //
  // Prázdný košík se **nezapisuje**, klíč se maže. Dřív vznikl `linda_cart`
  // s `[]` při prvním zobrazení jakékoliv stránky. Bez souhlasu se do
  // prohlížeče smí ukládat jen to, co je nezbytné pro službu, o kterou si
  // návštěvnice sama řekla (§ 89 odst. 3 zák. č. 127/2005 Sb.) – a o košík
  // si řekne až prvním „Přidat do košíku".
  useEffect(() => {
    if (nacteno) ulozit(KLIC, cart, ucet);
  }, [cart, ucet, nacteno]);

  const uzOvereno = useRef(false);

  useEffect(() => {
    if (!nacteno) return;

    if (!prihlasen) {
      // Odhlášení: kopie účtu z prohlížeče zmizí, jinak by košík zůstal
      // dalšímu, kdo k počítači sedne.
      if (ucetRef.current) {
        posledniDotaz.current++;
        setCart([]);
        setUcet(false);
        setSynchronizuje(false);
        return;
      }

      /*
       * Přepočet košíku, který je jen v prohlížeči. Bez tohohle si
       * nepřihlášená zákaznice nesla ceny a skladovost z chvíle vložení –
       * klidně týden starou – a o vyprodání se dozvěděla až v pokladně.
       */
      if (uzOvereno.current) return;
      uzOvereno.current = true;

      const mistni = cartRef.current;
      if (mistni.length === 0) {
        setSynchronizuje(false);
        return;
      }
      setSynchronizuje(true);
      void synchronizovat(() =>
        poslatJson<OdpovedKosiku>('/api/kosik/overit', {
          polozky: mistni.map((p) => ({ variantId: p.variantId, mnozstvi: p.mnozstvi })),
        })
      );
      return;
    }

    // Přihlášení: košík hosta se **jednou** sloučí s účtem. Kopie účtu se jen
    // obnoví – slučovat ji by vracelo, co zákaznice na jiném zařízení odebrala.
    const hosta = !ucetRef.current && cartRef.current.length > 0;
    setSynchronizuje(true);
    void synchronizovat(() =>
      hosta
        ? poslatJson<OdpovedKosiku>('/api/kosik', {
            polozky: cartRef.current.map((p) => ({ variantId: p.variantId, mnozstvi: p.mnozstvi })),
          })
        : nacist<OdpovedKosiku>('/api/kosik')
    );
  }, [prihlasen, nacteno, synchronizovat]);

  // Návrat na stránku = obnovit košík z účtu (změny z jiného zařízení).
  useEffect(() => {
    if (!prihlasen) return;
    return priNavratuNaStranku(() => {
      if (ucetRef.current) void synchronizovat(() => nacist<OdpovedKosiku>('/api/kosik'));
    });
  }, [prihlasen, synchronizovat]);

  /** Změna množství u účtu (0 = odebrat); u nepřihlášené zákaznice se neděje nic. */
  const synchronizovatPolozku = (variantId: string, mnozstvi: number) => {
    if (!prihlasen) return;
    void synchronizovat(() =>
      poslatJson<OdpovedKosiku>('/api/kosik', { variantId, mnozstvi }, 'PATCH')
    ).then((v) => {
      if (!v.ok) void synchronizovat(() => nacist<OdpovedKosiku>('/api/kosik'));
    });
  };

  /* Množství se počítá z `cartRef`, ne uvnitř `setCart(prev => …)`: updater
     má být čistý – React ho ve vývoji volá dvakrát a síťový dotaz uvnitř
     odcházel dvakrát. */
  const nastavitKosik = (dalsi: CartItemType[]) => {
    cartRef.current = dalsi;
    setCart(dalsi);
  };

  const addToCart = (item: CartItemType) => {
    const stavajici = cartRef.current.find((i) => i.variantId === item.variantId);

    // Nikdy víc, než kolik je skladem – jinak by objednávka spadla až
    // v pokladně.
    const noveMnozstvi = Math.min(
      (stavajici?.mnozstvi ?? 0) + item.mnozstvi,
      item.skladem || Number.MAX_SAFE_INTEGER
    );

    nastavitKosik(
      stavajici
        ? cartRef.current.map((i) => (i.variantId === item.variantId ? { ...i, mnozstvi: noveMnozstvi } : i))
        : [...cartRef.current, { ...item, mnozstvi: noveMnozstvi }]
    );
    synchronizovatPolozku(item.variantId, noveMnozstvi);
  };

  const removeFromCart = (variantId: string) => {
    nastavitKosik(cartRef.current.filter((i) => i.variantId !== variantId));
    synchronizovatPolozku(variantId, 0);
  };

  const updateQuantity = (variantId: string, mnozstvi: number) => {
    if (mnozstvi <= 0) {
      removeFromCart(variantId);
      return;
    }

    const polozka = cartRef.current.find((i) => i.variantId === variantId);
    if (!polozka) return;

    const omezene = Math.min(mnozstvi, polozka.skladem || Number.MAX_SAFE_INTEGER);
    nastavitKosik(cartRef.current.map((i) => (i.variantId === variantId ? { ...i, mnozstvi: omezene } : i)));
    synchronizovatPolozku(variantId, omezene);
  };

  const clearCart = () => {
    nastavitKosik([]);
    // S košíkem padají i uplatněné kódy a rozpracovaná pokladna – patřily
    // k tomuhle nákupu.
    zapomenoutKody();
    zapomenoutKoncept();
    if (prihlasen) {
      // Odpověď dotazu, který právě běží, už nesmí košík vrátit.
      posledniDotaz.current++;
      void poslatJson('/api/kosik', undefined, 'DELETE');
    }
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
        nacteno,
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
