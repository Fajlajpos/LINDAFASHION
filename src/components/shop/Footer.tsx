'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, ShieldCheck, Truck, RotateCcw, Heart, Send } from 'lucide-react';

interface FooterProps {
  onOpenCookieSettings?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCookieSettings }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#2B2019] text-[#FAF8F4] pt-16 pb-12 border-t border-[#7A4B32]/30">
      {/* Guarantees bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-[#FAF8F4]/10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="flex flex-col items-center p-4">
          <Truck className="w-8 h-8 text-[#6B7255] mb-3 stroke-[1.5]" />
          <h4 className="font-serif text-lg text-[#E4D9C8]">Doprava Zdarma</h4>
          <p className="text-xs text-[#FAF8F4]/70 mt-1">Při nákupu nad 2 500 Kč po celé ČR a SR</p>
        </div>
        <div className="flex flex-col items-center p-4">
          <ShieldCheck className="w-8 h-8 text-[#6B7255] mb-3 stroke-[1.5]" />
          <h4 className="font-serif text-lg text-[#E4D9C8]">100% Italská Kvalita</h4>
          <p className="text-xs text-[#FAF8F4]/70 mt-1">Pečlivě vybírané kousky z italských módních dílen</p>
        </div>
        <div className="flex flex-col items-center p-4">
          <RotateCcw className="w-8 h-8 text-[#6B7255] mb-3 stroke-[1.5]" />
          <h4 className="font-serif text-lg text-[#E4D9C8]">14 Dní Na Vrácení</h4>
          <p className="text-xs text-[#FAF8F4]/70 mt-1">Bezstarostná výměna i vrácení zboží zdarma</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand story */}
        <div className="space-y-4">
          <span className="font-serif text-2xl tracking-[0.15em] text-[#E4D9C8] uppercase font-medium block">
            LINDA FASHION
          </span>
          <p className="text-xs text-[#FAF8F4]/70 leading-relaxed">
            Příběh o lásce k eleganci, kvalitním materiálům a osobitému italskému stylu. Každý kus v našem butiku vybíráme s pečlivostí pro moderní ženu.
          </p>

          {/* Social media styled monochrome icons */}
          <div className="pt-2 flex items-center space-x-4 text-[#E4D9C8]">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-[#E4D9C8]/30 rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-[#E4D9C8]/30 rounded-full hover:border-[#7A4B32] hover:text-[#7A4B32] transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="font-serif text-base text-[#E4D9C8] tracking-wider uppercase">Nákup & Služby</h4>
          <ul className="space-y-2 text-xs text-[#FAF8F4]/80">
            <li>
              <Link href="/produkty" className="hover:text-[#E4D9C8] transition-colors">
                Katalog oblečení
              </Link>
            </li>
            <li>
              <Link href="/produkty/darkove-poukazy" className="hover:text-[#E4D9C8] transition-colors font-medium text-[#E4D9C8]">
                Dárkové poukazy
              </Link>
            </li>
            <li>
              <Link href="/doprava-a-platba" className="hover:text-[#E4D9C8] transition-colors">
                Možnosti dopravy a platby
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="hover:text-[#E4D9C8] transition-colors">
                Kontakt & Podpora
              </Link>
            </li>
            <li>
              <Link href="/o-mne" className="hover:text-[#E4D9C8] transition-colors">
                Příběh Lindy
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal Links */}
        <div className="space-y-3">
          <h4 className="font-serif text-base text-[#E4D9C8] tracking-wider uppercase">Právní informace</h4>
          <ul className="space-y-2 text-xs text-[#FAF8F4]/80">
            <li>
              <Link href="/obchodni-podminky" className="hover:text-[#E4D9C8] transition-colors">
                Obchodní podmínky
              </Link>
            </li>
            <li>
              <Link href="/ochrana-osobnich-udaju" className="hover:text-[#E4D9C8] transition-colors">
                Ochrana osobních údajů (GDPR)
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-[#E4D9C8] transition-colors">
                Zásady používání cookies
              </Link>
            </li>
            <li>
              <Link href="/reklamacni-rad" className="hover:text-[#E4D9C8] transition-colors">
                Reklamační řád & Vrácení
              </Link>
            </li>
            <li>
              {/* Permanent cookie settings button required by GDPR */}
              <button
                onClick={onOpenCookieSettings}
                className="hover:text-[#E4D9C8] transition-colors text-left underline underline-offset-2 text-[#E4D9C8]/90"
              >
                Nastavení souborů cookies
              </button>
            </li>
          </ul>
        </div>

        {/* Newsletter box */}
        <div className="space-y-4">
          <h4 className="font-serif text-base text-[#E4D9C8] tracking-wider uppercase">Inspirace do schránky</h4>
          <p className="text-xs text-[#FAF8F4]/70">
            Přihlaste se k odběru novinek z nových italských kolekcí a získejte přístup k exkluzivním nabídkám.
          </p>

          {subscribed ? (
            <div className="p-3 bg-[#6B7255]/30 border border-[#6B7255] rounded-md text-xs text-[#FAF8F4] flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#E4D9C8]" />
              <span>Děkujeme za přihlášení k newsletteru!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Váš e-mail..."
                  className="w-full bg-[#FAF8F4]/10 border border-[#E4D9C8]/30 rounded-full py-2 pl-4 pr-10 text-xs text-[#FAF8F4] placeholder-[#FAF8F4]/50 focus:outline-none focus:border-[#E4D9C8]"
                />
                <button type="submit" className="absolute right-2 top-1.5 p-1 text-[#E4D9C8] hover:text-white" aria-label="Odeslat">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-[#FAF8F4]/50">
                Odesláním souhlasíte se zpracováním osobních údajů. Odběr můžete kdykoliv zrušit.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-[#FAF8F4]/10 text-center text-xs text-[#FAF8F4]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; {new Date().getFullYear()} LINDA FASHION s.r.o. Všechna práva vyhrazena.</p>
        <p className="font-serif italic text-sm text-[#E4D9C8]">Prémiová italská móda pro ženy s vřelým srdcem</p>
      </div>
    </footer>
  );
};
