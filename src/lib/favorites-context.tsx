'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { poslatJson } from './api-klient';

/**
 * Oblíbené se ukládají jako otisk produktu, ne jako holé ID.
 *
 * Stránka /oblibene je čistě klientská a katalog zatím nemá endpoint, ze
 * kterého by si podle ID dotáhla názvy a ceny. Se seznamem ID by proto uměla
 * vypsat jen kousky, které má náhodou napevno u sebe – cokoliv uloženého
 * odjinud (homepage, detail) by zmizelo. Otisk je malý a stránka z něj
 * vykreslí kartu bez dalšího dotazu.
 *
 * Klíčem je `slug`, ne `id`: slug je v celé aplikaci jednoznačný a mají ho
 * všechna místa se srdíčkem, kdežto ukázková ID se mezi zdroji dat překrývají
 * (`p5` je v katalogu poukaz, na homepage halenka).
 */
export interface FavoriteItem {
  slug: string;
  nazev: string;
  cena: number;
  cenaPoSleve?: number | null;
  znacka?: string | null;
  kategorieNazev?: string | null;
  obrazekUrl?: string | null;
  jeDarkovyPoukaz?: boolean;
}

const STORAGE_KEY = 'linda_favorites';

interface FavoritesContextType {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  removeFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

/** Starší verze ukládala `string[]`; takové záznamy zahodíme, nedají se dopočítat. */
const parseFavorites = (raw: string): FavoriteItem[] => {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is FavoriteItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as FavoriteItem).slug === 'string' &&
      typeof (item as FavoriteItem).nazev === 'string'
  );
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode; prihlasen?: boolean }> = ({
  children,
  prihlasen = false,
}) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  /* Pojistka proti přepsání: bez ní zápisový efekt proběhl hned po prvním
     renderu s prázdným polem a smazal uložený seznam dřív, než se stihl
     projevit ten načtený. Je to `useState`, ne `useRef`, právě proto – ref
     by se přepnul ve stejném průchodu efekty a zápis by ještě viděl `[]`.
     Stav zápisový efekt znovu spustí, až se načtená data opravdu vykreslí. */
  const [nacteno, setNacteno] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFavorites(parseFavorites(saved));
      } catch (e) {
        console.error('Chyba načtení oblíbených:', e);
      }
    }
    setNacteno(true);
  }, []);

  useEffect(() => {
    if (!nacteno) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, nacteno]);

  /* Po přihlášení pošleme oblíbené z prohlížeče na server a převezmeme
     sloučený seznam. Server je pak zdrojem pravdy – vypadnou z něj kousky,
     které mezitím zmizely z nabídky. Sloučení běží jednou. */
  const uzSlouceno = useRef(false);

  useEffect(() => {
    if (!nacteno) return;

    if (!prihlasen) {
      uzSlouceno.current = false;
      return;
    }

    if (uzSlouceno.current) return;
    uzSlouceno.current = true;

    void (async () => {
      const vysledek = await poslatJson<{ oblibene: FavoriteItem[] }>('/api/oblibene', {
        slugy: favorites.map((f) => f.slug),
      });

      if (vysledek.ok) setFavorites(vysledek.data.oblibene);
    })();
    // `favorites` schválně mimo závislosti – jinak by se sloučení spouštělo
    // po každém kliknutí na srdíčko.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prihlasen, nacteno]);

  const toggleFavorite = (item: FavoriteItem) => {
    const jeUlozeny = favorites.some((f) => f.slug === item.slug);

    setFavorites((prev) =>
      jeUlozeny ? prev.filter((f) => f.slug !== item.slug) : [...prev, item]
    );

    if (prihlasen) {
      void poslatJson('/api/oblibene', { slug: item.slug }, jeUlozeny ? 'DELETE' : 'POST');
    }
  };

  const removeFavorite = (slug: string) => {
    setFavorites((prev) => prev.filter((f) => f.slug !== slug));
    if (prihlasen) void poslatJson('/api/oblibene', { slug }, 'DELETE');
  };

  const isFavorite = (slug: string) => favorites.some((f) => f.slug === slug);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        removeFavorite,
        isFavorite,
        favoritesCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites musí být použit uvnitř FavoritesProvider');
  }
  return context;
};
