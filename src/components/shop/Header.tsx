'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Heart, User, LayoutDashboard, Menu, X, Search, Sparkles } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

interface HeaderProps {
  user?: { jmeno?: string | null; email: string; role?: string | null } | null;
  vacationMode?: { active: boolean; message?: string | null };
}

/* Kategorie míří na vlastní cestu `/produkty/[kategorie]`, ne na
   `?kategorie=` nad `/produkty`. Ta routa už existuje (dřív ne, odtud starý
   tvar odkazů) a obojí vykresluje tentýž `KatalogVypis`, takže obsah je
   stejný. Rozdíl je v rychlosti: `<Link>` přednačítá podle cesty, kdežto
   všechny čtyři odkazy s query parametrem vypadají jako jedna a táž
   `/produkty` – přednačetla se z nich nanejvýš jedna a zbytek se pokaždé
   táhl ze serveru až po kliknutí. Cesta navíc drží drobečkovou navigaci
   a kanonickou adresu. */
const NAV_LINKS = [
  { href: '/produkty', label: 'Kolekce' },
  { href: '/produkty/saty', label: 'Šaty' },
  { href: '/produkty/halenky-a-kosile', label: 'Halenky' },
  { href: '/produkty/svetry-a-kardigany', label: 'Svetry' },
  { href: '/produkty/darkove-poukazy', label: 'Poukazy', accent: true },
  { href: '/o-mne', label: 'O mně' },
];

/** Počty nad 9 zkracujeme, aby se odznak nerozjel mimo ikonu. */
const formatBadge = (count: number) => (count > 9 ? '9+' : String(count));

/**
 * Stránky, kde je hlavička rovnou sbalená, i když je návštěvník na začátku
 * stránky. Detail produktu není čtení – vybírá se tu velikost, kontroluje
 * dostupnost a přidává do košíku. Vysoká lišta z toho ukrajuje první obrazovku
 * a volba velikosti spadne pod okraj. Vysoká hlavička patří k rozhlížení
 * (homepage, katalog), ne k práci s jedním kusem.
 */
const jeKompaktniStranka = (pathname: string | null) =>
  Boolean(pathname?.startsWith('/produkt/'));

export const Header: React.FC<HeaderProps> = ({
  user,
  vacationMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  /* Sbalený tvar drží buď skrol, nebo samotná stránka. Skrolem se pak už jen
     nic nemění – zpátky nahoru se na detailu lišta nerozevírá. */
  const pathname = usePathname();
  const isCompact = isScrolled || jeKompaktniStranka(pathname);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Cart & Favorites Context
  const { totalItemCount: cartCount } = useCart();
  const { favoritesCount } = useFavorites();

  /* Zkratka do administrace. Do téhle chvíle se na `/admin` dalo dostat jedině
     ručním přepsáním adresy – po přihlášení tam sice míří přesměrování, ale
     kdo se pak proklikal do obchodu, cestu zpátky už neměl. */
  const jeAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      // Hystereze: zvětšit zpět až pod 12 px. Bez ní se lišta na hranici
      // jednoho prahu překlápěla tam a zpět a přechod se pořád restartoval.
      setIsScrolled((prev) => (prev ? y > 12 : y > 40));
    };

    const handleScroll = () => {
      // Scroll umí přijít několikrát za snímek; rAF sloučí náraz událostí
      // do jediného přepočtu, takže React nepřekresluje hlavičku zbytečně.
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    // passive: scroll handler nikdy nevolá preventDefault, prohlížeč tak
    // nemusí čekat a scrollování zůstává plynulé
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Escape zavře otevřené vyhledávání i mobilní menu a vrátí fokus na spouštěč
  useEffect(() => {
    if (!searchOpen && !mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (searchOpen) {
        setSearchOpen(false);
        searchToggleRef.current?.focus();
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, mobileMenuOpen]);

  // Fokus do pole hned po otevření vyhledávání (nahrazuje autoFocus, který
  // by se spustil i při prvním vykreslení stránky)
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <header
      /* Krémová jako stránka a bez spodní linky – hlavičku od obsahu odděluje
         měkký reliéf, který se skrolem prohloubí (lišta se „zvedne“). */
      /* Jen `transition-shadow`: `transition-all` spolu s přepínáním `py`
         rozjelo druhou, konkurenční animaci výšky vedle té na vnitřní mřížce
         – lišta pak při skrolu poskakovala. Výšku mění jediné místo. */
      className={`sticky top-0 z-40 bg-linda-cream transition-shadow duration-300 ${
        isCompact ? 'shadow-neuBarRaised' : 'shadow-neuBar'
      }`}
    >
      {/* Vacation mode banner */}
      {vacationMode?.active && (
        <div className="bg-linda-cognac text-linda-cream text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{vacationMode.message || 'Momentálně čerpáme dovolenou. Objednávky přijímáme a expedujeme ihned po návratu.'}</span>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* 3-Column Grid with Shrinking Height on Scroll */}
        {/* Pod `lg` jde o flex: pevná mřížka 3/6/3 dávala ikonám jen ~86 px,
            ačkoli čtyři dotykové cíle po 44 px potřebují 176 – ikony proto
            přetékaly doleva přes logo. Ve flexu si krajní bloky vezmou, co
            potřebují, a logo dostane zbytek. Od `lg` zůstává mřížka 4/4/4. */}
        <div
          className={`flex items-center justify-between gap-2 transition-[height] duration-300 ease-out lg:grid lg:grid-cols-12 ${
            isCompact ? 'h-16' : 'h-24'
          }`}
        >
          {/* Left Column: Nav links.
              Sloupce jsou 4/4/4 (dřív 5/2/5) – na 1024 px měl střed jen ~160 px
              a logo přetékalo pod odkaz „O mně“. */}
          <div className="flex shrink-0 items-center justify-start lg:col-span-4 lg:pl-0 xl:pl-8">
            {/* Mobile menu button */}
            <button
              ref={menuToggleRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer text-linda-espresso hover:text-linda-cognac transition-colors lg:hidden"
              aria-label={mobileMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobilni-menu"
            >
              {/* Obě ikony leží na sobě a přepínají se pootočením s prolnutím.
                  Dřív se jedna odmountovala a druhá naskočila skokem – u prvku,
                  který má oznámit „stav se přepnul“, je ta čtvrtsekunda pohybu
                  celá informace. Rozměr drží obal, ne ikony, takže se lišta
                  během přechodu nehne. */}
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Menu
                  className={`absolute h-6 w-6 transition-all duration-200 ease-out ${
                    mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                  }`}
                  aria-hidden="true"
                />
                <X
                  className={`absolute h-6 w-6 transition-all duration-200 ease-out ${
                    mobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav
              aria-label="Hlavní navigace"
              className="hidden lg:flex items-center gap-2 xl:gap-4 text-[11px] xl:text-xs font-medium tracking-wider uppercase text-linda-espresso whitespace-nowrap"
            >
              {NAV_LINKS.map(({ href, label, accent }) => (
                <Link
                  key={href}
                  href={href}
                  /* Vlasové podtržítko se vysouvá zleva. Kreslí ho `::after`
                     přes `scaleX`, ne přes rostoucí šířku – šířka nutí
                     prohlížeč přepočítat rozvržení v každém snímku, kdežto
                     `transform` odbaví kompozitor. Prvek je vlasový (1 px) a
                     leží uvnitř `py-2`, takže odkazy nemění výšku. */
                  className={`relative py-2 rounded-sm transition-colors hover:text-linda-cognac after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-linda-cognac after:transition-transform after:duration-200 after:ease-out after:content-[''] hover:after:scale-x-100 ${
                    accent ? 'text-linda-cognac font-semibold' : ''
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center Column: Centered Brand Logo */}
          {/* `overflow-hidden`: pod ~350 px už na logo místo není (menu + čtyři
              ikony po 44 px sežerou skoro celou šířku). Raději ať se ořízne,
              než aby přeteklo přes ikony. Od 360 px se vejde celé. */}
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-1 text-center lg:col-span-4 lg:flex-none lg:px-2">
            <Link href="/" className="inline-block group text-center rounded-sm" aria-label="LINDA FASHION – domovská stránka">
              <span
                /* Na 375 px má prostřední sloupec jen ~170 px. Logo proto na
                   nejmenších displejích zmenšujeme a stahujeme prostrkání,
                   jinak přeteče pod ikony vpravo. */
                /* `whitespace-nowrap` až od `sm`. Na velmi úzkých displejích
                   se tak nápis raději zalomí na dva řádky, než aby se ořízl. */
                /* Zmenšení řešíme `scale`, ne `font-size` + `letter-spacing`:
                   ty dvě vlastnosti nutí prohlížeč přesázet text v každém
                   snímku (layout + paint), což byl hlavní zdroj trhání.
                   `scale` běží na kompozitoru. Poměry odpovídají původním
                   velikostem – sm 24→20 px (0.833), xl 30→24 px (0.8). */
                className={`font-serif uppercase font-medium text-linda-espresso group-hover:text-linda-cognac transition-[transform,color] duration-300 ease-out block origin-center transform-gpu text-[13px] tracking-[0.05em] sm:whitespace-nowrap sm:text-2xl sm:tracking-[0.14em] xl:text-3xl xl:tracking-[0.2em] ${
                  isCompact ? 'scale-100 sm:scale-[0.833] xl:scale-[0.8]' : 'scale-100'
                }`}
              >
                LINDA FASHION
              </span>
              {/* Podtitul zůstává v DOM a jen se sbalí. Dřív se odmountoval,
                  takže zmizel skokem uprostřed přechodu hlavičky. */}
              <span
                aria-hidden={isCompact}
                className={`block overflow-hidden -mt-1 text-[9px] tracking-[0.35em] text-linda-sage uppercase font-sans font-semibold transition-[max-height,opacity] duration-300 ease-out ${
                  isCompact ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100'
                }`}
              >
                Moda Italiana
              </span>
            </Link>
          </div>

          {/* Right Column: Action icons */}
          <div className="flex shrink-0 items-center justify-end gap-0 text-linda-espresso sm:gap-1 lg:col-span-4 lg:gap-2">
            {/* Search */}
            <button
              ref={searchToggleRef}
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="group min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={searchOpen ? 'Zavřít vyhledávání' : 'Otevřít vyhledávání'}
              aria-expanded={searchOpen}
              aria-controls="vyhledavani"
            >
              {/* Ikony v liště reagují jednotně: nadechnutí při najetí,
                  stlačení při stisku. Dotykový cíl (44 px) se nemění, pohyb
                  má jen kresba uvnitř – jinak by se sousední ikony strkaly. */}
              <Search
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
            </button>

            {/* Favorites */}
            <Link
              href="/oblibene"
              className="group min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors relative"
              aria-label={
                favoritesCount > 0
                  ? `Oblíbené položky (${favoritesCount})`
                  : 'Oblíbené položky'
              }
            >
              <Heart
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {favoritesCount > 0 && (
                <span
                  aria-hidden="true"
                  /* `key` na počtu je celý smysl: bez něj React jen přepíše
                     text uvnitř téhož uzlu a animace, která se pouští při
                     namountování, se podruhé nespustí. S ním odznak při každé
                     změně počtu znovu naskočí – přidání do oblíbených se dělo
                     o stránku níž a jinak by o něm lišta mlčela. */
                  key={favoritesCount}
                  className="animate-popIn absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-linda-sage text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(favoritesCount)}
                </span>
              )}
            </Link>

            {/* Administrace – jen pro majitelku.
                Vyvýšená pilulka v krémové liště: je to jediný prvek hlavičky,
                který má vystoupit, takže reliéf nese význam. Pod `lg` se
                schovává, tam už čtyři dotykové cíle po 44 px zabírají skoro
                celou šířku – na malých displejích vede do administrace
                položka v rozbalovacím menu. */}
            {jeAdmin && (
              <Link
                href="/admin"
                className="group hidden min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-linda-cream px-4 text-xs font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 hover:shadow-neu active:shadow-neuInsetSm lg:flex"
              >
                <LayoutDashboard
                  className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                  aria-hidden="true"
                />
                Administrace
              </Link>
            )}

            {/* Account / Admin */}
            <Link
              href={user ? '/muj-ucet' : '/prihlaseni'}
              className="group min-h-touch flex items-center justify-center gap-1.5 px-2 cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={user ? 'Můj účet' : 'Přihlásit se'}
            >
              <User
                className="w-5 h-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {user && (
                <span className="hidden md:inline text-xs font-medium max-w-[90px] truncate">
                  {user.jmeno || user.email.split('@')[0]}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/kosik"
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors relative group"
              aria-label={
                cartCount > 0
                  ? `Košík (${cartCount} ${cartCount === 1 ? 'položka' : cartCount < 5 ? 'položky' : 'položek'})`
                  : 'Košík je prázdný'
              }
            >
              <ShoppingBag
                className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                aria-hidden="true"
              />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  // `key` na počtu – viz odznak oblíbených výš.
                  key={cartCount}
                  className="animate-popIn absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-linda-cognac text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(cartCount)}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <div id="vyhledavani" className="animate-fadeIn py-3">
            <form action="/produkty" method="GET" role="search" className="relative max-w-md mx-auto">
              <label htmlFor="hledat" className="sr-only">
                Hledat v nabídce
              </label>
              <input
                ref={searchInputRef}
                id="hledat"
                type="search"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat šaty, halenky, materiály..."
                /* Pole je prohlubeň v liště – rámeček by reliéf jen zdvojil. */
                className="w-full rounded-full bg-linda-sandLight py-2.5 pl-4 pr-12 text-sm text-linda-espresso shadow-neuInsetSm placeholder:text-linda-espresso/60"
              />
              <button
                type="submit"
                /* Posun na hoveru patří ikoně uvnitř, ne tomuhle tlačítku:
                   samo se polohuje `-translate-y-1/2` a pravidlo pro
                   `prefers-reduced-motion` vypíná `transform` celého prvku –
                   tlačítko by v tu chvíli vyskočilo z osy pole. */
                className="group absolute right-1 top-1/2 -translate-y-1/2 min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full text-linda-cognac hover:text-linda-espresso transition-colors"
                aria-label="Vyhledat"
              >
                <Search
                  className="w-4 h-4 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90"
                  aria-hidden="true"
                />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <nav
          id="mobilni-menu"
          aria-label="Mobilní navigace"
          className="animate-fadeIn bg-linda-cream px-6 pb-6 pt-2 text-center text-xs font-medium uppercase tracking-wider text-linda-espresso shadow-neuBarRaised lg:hidden"
        >
          {/* Administrace nahoře a oddělená – není to část nabídky obchodu,
              ale vstup jinam. V liště se pilulka pod `lg` nevejde. */}
          {jeAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-2 flex min-h-touch items-center justify-center gap-2 rounded-full bg-linda-cream font-semibold text-linda-cognac shadow-neuSm transition-all duration-200 active:shadow-neuInsetSm"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              Administrace
            </Link>
          )}

          {NAV_LINKS.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex min-h-touch items-center justify-center border-b border-linda-sand/40 ${
                accent ? 'font-semibold text-linda-cognac' : ''
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/kontakt"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center min-h-touch text-linda-sage"
          >
            Kontakt &amp; Showroom
          </Link>
        </nav>
      )}
    </header>
  );
};
