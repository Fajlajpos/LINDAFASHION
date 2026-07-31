'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, User, Menu, X, Search, Sparkles } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

interface HeaderProps {
  user?: { jmeno?: string | null; email: string } | null;
  vacationMode?: { active: boolean; message?: string | null };
}

/* Katalog filtruje přes query parametr – route `/produkty/[slug]` neexistuje,
   odkazy typu `/produkty/saty` proto dřív končily na 404. */
const NAV_LINKS = [
  { href: '/produkty', label: 'Kolekce' },
  { href: '/produkty?kategorie=saty', label: 'Šaty' },
  { href: '/produkty?kategorie=halenky-a-kosile', label: 'Halenky' },
  { href: '/produkty?kategorie=svetry-a-kardigany', label: 'Svetry' },
  { href: '/produkty?kategorie=darkove-poukazy', label: 'Poukazy', accent: true },
  { href: '/o-mne', label: 'O mně' },
];

/** Počty nad 9 zkracujeme, aby se odznak nerozjel mimo ikonu. */
const formatBadge = (count: number) => (count > 9 ? '9+' : String(count));

export const Header: React.FC<HeaderProps> = ({
  user,
  vacationMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Cart & Favorites Context
  const { totalItemCount: cartCount } = useCart();
  const { favoritesCount } = useFavorites();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    // passive: scroll handler nikdy nevolá preventDefault, prohlížeč tak
    // nemusí čekat a scrollování zůstává plynulé
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      className={`sticky top-0 z-40 bg-white border-b border-linda-sand transition-all duration-300 ${
        isScrolled ? 'shadow-md py-1' : 'shadow-sm py-0'
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
          className={`flex items-center justify-between gap-2 transition-all duration-300 lg:grid lg:grid-cols-12 ${
            isScrolled ? 'h-16' : 'h-24'
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
              {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
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
                  className={`py-2 rounded-sm hover:text-linda-cognac transition-colors ${
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
                className={`font-serif uppercase font-medium text-linda-espresso group-hover:text-linda-cognac transition-all duration-300 block sm:whitespace-nowrap ${
                  isScrolled
                    ? 'text-[13px] tracking-[0.05em] sm:text-xl sm:tracking-[0.12em] xl:text-2xl xl:tracking-[0.15em]'
                    : 'text-[13px] tracking-[0.05em] sm:text-2xl sm:tracking-[0.14em] xl:text-3xl xl:tracking-[0.2em]'
                }`}
              >
                LINDA FASHION
              </span>
              {!isScrolled && (
                <span className="block text-[9px] tracking-[0.35em] text-linda-sage uppercase font-sans font-semibold -mt-1 transition-all duration-300">
                  Moda Italiana
                </span>
              )}
            </Link>
          </div>

          {/* Right Column: Action icons */}
          <div className="flex shrink-0 items-center justify-end gap-0 text-linda-espresso sm:gap-1 lg:col-span-4 lg:gap-2">
            {/* Search */}
            <button
              ref={searchToggleRef}
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={searchOpen ? 'Zavřít vyhledávání' : 'Otevřít vyhledávání'}
              aria-expanded={searchOpen}
              aria-controls="vyhledavani"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Favorites */}
            <Link
              href="/oblibene"
              className="min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full hover:text-linda-cognac transition-colors relative"
              aria-label={
                favoritesCount > 0
                  ? `Oblíbené položky (${favoritesCount})`
                  : 'Oblíbené položky'
              }
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
              {favoritesCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-linda-sage text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(favoritesCount)}
                </span>
              )}
            </Link>

            {/* Account / Admin */}
            <Link
              href={user ? '/muj-ucet' : '/prihlaseni'}
              className="min-h-touch flex items-center justify-center gap-1.5 px-2 cursor-pointer rounded-full hover:text-linda-cognac transition-colors"
              aria-label={user ? 'Můj účet' : 'Přihlásit se'}
            >
              <User className="w-5 h-5 shrink-0" aria-hidden="true" />
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
              <ShoppingBag className="w-5 h-5 group-hover:scale-105 transition-transform" aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-linda-cognac text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold"
                >
                  {formatBadge(cartCount)}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <div id="vyhledavani" className="py-3 border-t border-linda-sand/60 animate-fadeIn">
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
                className="w-full bg-linda-cream border border-linda-sand rounded-full py-2.5 pl-4 pr-12 text-sm text-linda-espresso placeholder:text-linda-espresso/50 focus:border-linda-cognac"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-touch min-w-touch flex items-center justify-center cursor-pointer rounded-full text-linda-cognac hover:text-linda-espresso transition-colors"
                aria-label="Vyhledat"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
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
          className="lg:hidden bg-white border-b border-linda-sand px-6 pt-2 pb-6 text-xs font-medium uppercase tracking-wider text-linda-espresso text-center animate-fadeIn"
        >
          {NAV_LINKS.map(({ href, label, accent }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-center min-h-touch border-b border-linda-sand/40 ${
                accent ? 'text-linda-cognac font-semibold' : ''
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
