'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, User, Menu, X, Search, Sparkles } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFavorites } from '@/lib/favorites-context';

interface HeaderProps {
  user?: { jmeno?: string | null; email: string } | null;
  vacationMode?: { active: boolean; message?: string | null };
}

export const Header: React.FC<HeaderProps> = ({
  user,
  vacationMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // Cart & Favorites Context
  const { totalItemCount: cartCount } = useCart();
  const { favoritesCount } = useFavorites();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 bg-white border-b border-[#E4D9C8] transition-all duration-300 ${
        isScrolled ? 'shadow-md py-1' : 'shadow-sm py-0'
      }`}
    >
      {/* Vacation mode banner */}
      {vacationMode?.active && (
        <div className="bg-[#7A4B32] text-[#FAF8F4] text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{vacationMode.message || 'Momentálně čerpáme dovolenou. Objednávky přijímáme a expedujeme ihned po návratu.'}</span>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* 3-Column Grid with Shrinking Height on Scroll */}
        <div
          className={`grid grid-cols-12 items-center transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-24'
          }`}
        >
          {/* Left Column (5 cols): Nav links */}
          <div className="col-span-5 flex items-center justify-start pl-4 lg:pl-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#2B2019] hover:text-[#7A4B32] transition-colors focus:outline-none lg:hidden"
              aria-label="Otevřít menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-3 xl:space-x-4 text-[11px] xl:text-xs font-medium tracking-wider uppercase text-[#2B2019] whitespace-nowrap">
              <Link href="/produkty" className="hover:text-[#7A4B32] transition-colors">
                Kolekce
              </Link>
              <Link href="/produkty/saty" className="hover:text-[#7A4B32] transition-colors">
                Šaty
              </Link>
              <Link href="/produkty/halenky-a-kosile" className="hover:text-[#7A4B32] transition-colors">
                Halenky
              </Link>
              <Link href="/produkty/svetry-a-kardigany" className="hover:text-[#7A4B32] transition-colors">
                Svetry
              </Link>
              <Link href="/produkty/darkove-poukazy" className="hover:text-[#7A4B32] transition-colors text-[#7A4B32] font-semibold">
                Poukazy
              </Link>
              <Link href="/o-mne" className="hover:text-[#7A4B32] transition-colors">
                O mně
              </Link>
            </nav>
          </div>

          {/* Center Column (2 cols): Centered Brand Logo */}
          <div className="col-span-2 flex flex-col items-center justify-center text-center px-2">
            <Link href="/" className="inline-block group text-center">
              <span
                className={`font-serif uppercase font-medium text-[#2B2019] group-hover:text-[#7A4B32] transition-all duration-300 block whitespace-nowrap ${
                  isScrolled ? 'text-xl sm:text-2xl tracking-[0.15em]' : 'text-2xl sm:text-3xl tracking-[0.2em]'
                }`}
              >
                LINDA FASHION
              </span>
              {!isScrolled && (
                <span className="block text-[9px] tracking-[0.35em] text-[#405023] uppercase font-sans font-semibold -mt-1 transition-all duration-300">
                  Moda Italiana
                </span>
              )}
            </Link>
          </div>

          {/* Right Column (5 cols): Action icons */}
          <div className="col-span-5 flex items-center justify-end space-x-3 sm:space-x-5 text-[#2B2019] pr-0 -mr-2">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:text-[#7A4B32] transition-colors"
              aria-label="Vyhledávání"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Favorites */}
            <Link href="/oblibene" className="p-2 hover:text-[#7A4B32] transition-colors relative" aria-label="Oblíbené položky">
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-[#405023] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {favoritesCount}
                </span>
              )}
            </Link>

            {/* Account / Admin */}
            <Link href={user ? '/muj-ucet' : '/prihlaseni'} className="p-2 hover:text-[#7A4B32] transition-colors flex items-center gap-1.5" aria-label="Účet">
              <User className="w-5 h-5" />
              {user && (
                <span className="hidden md:inline text-xs font-medium max-w-[90px] truncate">
                  {user.jmeno || user.email.split('@')[0]}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/kosik" className="p-2 hover:text-[#7A4B32] transition-colors relative flex items-center gap-2 group" aria-label="Košík">
              <div className="relative">
                <ShoppingBag className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#7A4B32] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <div className="py-3 border-t border-[#E4D9C8]/60 animate-fadeIn">
            <form action="/produkty" method="GET" className="relative max-w-md mx-auto">
              <input
                type="text"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat šaty, halenky, materiály..."
                className="w-full bg-[#FAF8F4] border border-[#E4D9C8] rounded-full py-2 pl-4 pr-10 text-sm text-[#2B2019] focus:outline-none focus:border-[#7A4B32]"
                autoFocus
              />
              <button type="submit" className="absolute right-3 top-2.5 text-[#7A4B32]">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E4D9C8] px-6 pt-2 pb-6 space-y-3 text-xs font-medium uppercase tracking-wider text-[#2B2019] text-center">
          <Link href="/produkty" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40">
            Kolekce
          </Link>
          <Link href="/produkty/saty" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40">
            Šaty
          </Link>
          <Link href="/produkty/halenky-a-kosile" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40">
            Halenky
          </Link>
          <Link href="/produkty/svetry-a-kardigany" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40">
            Svetry
          </Link>
          <Link href="/produkty/darkove-poukazy" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40 text-[#7A4B32] font-semibold">
            Poukazy
          </Link>
          <Link href="/o-mne" onClick={() => setMobileMenuOpen(false)} className="block py-2 border-b border-[#E4D9C8]/40">
            O mně
          </Link>
          <Link href="/kontakt" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[#405023]">
            Kontakt &amp; Showroom
          </Link>
        </div>
      )}
    </header>
  );
};
