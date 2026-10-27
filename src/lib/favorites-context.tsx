'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { nacist, poslatJson, type Vysledek } from './api-klient';
import { nacistUlozeny, priNavratuNaStranku, ulozit } from './ucet-uloziste';

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

  /**
   * Nejnižší cena za 30 dnů před slevou (§ 12a zák. č. 634/1992 Sb.).
   *
   * Otisk ji musí nést stejně jako cenu samotnou. Bez ní vykreslila karta na
   * `/oblibene` přeškrtnutou původní cenu – tedy oznámení o slevě – ale větu
   * o referenční ceně ani procento už ne, protože `ProductCard` bez tohohle
   * čísla obojí vědomě potlačí. Povinnost přitom platí u **každého** oznámení
   * slevy, ne jen v katalogu.
   */
  nejnizsiCena30DniHaleru?: number | null;

  znacka?: string | null;
  kategorieNazev?: string | null;
  obrazekUrl?: string | null;
  jeDarkovyPoukaz?: boolean;
  zemePuvodu?: string | null;
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
const jeOblibena = (item: unknown): item is FavoriteItem =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as FavoriteItem).slug === 'string' &&
  typeof (item as FavoriteItem).nazev === 'string';

interface OdpovedOblibenych {
  prihlasen: boolean;
  oblibene: FavoriteItem[];
}

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
  /** `ucet` = seznam je kopie účtu (viz ucet-uloziste.ts), `host` = jen v prohlížeči. */
  const [ucet, setUcet] = useState(false);

  // Efekty a obsluhy čtou aktuální hodnoty přes refy – závislosti efektů
  // se tak omezí na přihlášení a nespouští se po každém srdíčku.
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const ucetRef = useRef(ucet);
  ucetRef.current = ucet;

  /* Každý dotaz na server dostane pořadové číslo a jeho odpověď se použije,
     jen pokud mezitím nevyrazil novější. Jinak by pomalé obnovení po návratu
     na stránku přepsalo srdíčko, na které zákaznice právě klikla. */
  const posledniDotaz = useRef(0);

  const synchronizovat = useCallback(async (dotaz: () => Promise<Vysledek<OdpovedOblibenych>>) => {
    const cislo = ++posledniDotaz.current;
    const vysledek = await dotaz();
    if (cislo !== posledniDotaz.current || !vysledek.ok) return vysledek;

    if (vysledek.data.prihlasen) {
      setFavorites(vysledek.data.oblibene);
      setUcet(true);
    }
    return vysledek;
  }, []);

  useEffect(() => {
    const ulozeny = nacistUlozeny(STORAGE_KEY, jeOblibena);
    // Kopie účtu bez přihlášení (odhlášení, vypršelé přihlášení) se nenačte –
    // patří účtu, ne tomu, kdo je teď u prohlížeče.
    if (!ulozeny.ucet || prihlasen) {
      setFavorites(ulozeny.polozky);
      setUcet(ulozeny.ucet);
    }
    setNacteno(true);
    // Čte se jednou při načtení; změny přihlášení řeší efekt níž.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (nacteno) ulozit(STORAGE_KEY, favorites, ucet);
  }, [favorites, ucet, nacteno]);

  /* Přihlášení: seznam hosta se **jednou** sloučí s účtem, kopie účtu se jen
     obnoví ze serveru. Odhlášení: kopie účtu z prohlížeče zmizí. */
  useEffect(() => {
    if (!nacteno) return;

    if (!prihlasen) {
      if (ucetRef.current) {
        posledniDotaz.current++;
        setFavorites([]);
        setUcet(false);
      }
      return;
    }

    const hosta = !ucetRef.current && favoritesRef.current.length > 0;
    void synchronizovat(() =>
      hosta
        ? poslatJson<OdpovedOblibenych>('/api/oblibene', {
            slugy: favoritesRef.current.map((f) => f.slug),
          })
        : nacist<OdpovedOblibenych>('/api/oblibene')
    );
  }, [prihlasen, nacteno, synchronizovat]);

  // Návrat na stránku = obnovit ze serveru; změny z jiného zařízení se
  // jinak ukázaly až po ručním obnovení.
  useEffect(() => {
    if (!prihlasen) return;
    return priNavratuNaStranku(() => {
      if (ucetRef.current) void synchronizovat(() => nacist<OdpovedOblibenych>('/api/oblibene'));
    });
  }, [prihlasen, synchronizovat]);

  /** Změna u účtu; když neprojde, obnoví se seznam ze serveru, ať neukazuje nepravdu. */
  const zapsatNaServer = (slug: string, metoda: 'POST' | 'DELETE') => {
    if (!prihlasen) return;
    void synchronizovat(() => poslatJson<OdpovedOblibenych>('/api/oblibene', { slug }, metoda)).then(
      (v) => {
        if (!v.ok) void synchronizovat(() => nacist<OdpovedOblibenych>('/api/oblibene'));
      }
    );
  };

  const toggleFavorite = (item: FavoriteItem) => {
    const jeUlozeny = favoritesRef.current.some((f) => f.slug === item.slug);

    setFavorites((prev) =>
      jeUlozeny ? prev.filter((f) => f.slug !== item.slug) : [...prev, item]
    );
    zapsatNaServer(item.slug, jeUlozeny ? 'DELETE' : 'POST');
  };

  const removeFavorite = (slug: string) => {
    setFavorites((prev) => prev.filter((f) => f.slug !== slug));
    zapsatNaServer(slug, 'DELETE');
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
