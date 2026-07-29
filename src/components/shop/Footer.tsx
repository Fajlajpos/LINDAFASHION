'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Send, Heart } from 'lucide-react';

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
    <footer className="relative bg-[#3E2E25] text-[#FAF8F4] py-8 sm:py-10 border-t border-[#E4D9C8]/20 texture-footer-user overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Compact 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8 pb-8 border-b border-[#FAF8F4]/15">
          
          {/* Column 1 (4 cols): Brand Story & Socials */}
          <div className="lg:col-span-4 space-y-3">
            <Link href="/" className="inline-block group">
              <span className="font-serif text-2xl sm:text-3xl tracking-[0.18em] text-[#E4D9C8] uppercase font-medium group-hover:text-white transition-colors block">
                LINDA FASHION
              </span>
              <span className="block text-[9px] tracking-[0.35em] text-[#E4D9C8]/80 uppercase font-sans font-semibold mt-0.5">
                Moda Italiana
              </span>
            </Link>

            <p className="text-xs text-[#FAF8F4]/80 leading-relaxed font-light">
              Příběh o lásce k eleganci, poctivým přírodním materiálům a osobitému italskému stylu. Každý kus vybíráme osobně na cestách po provinciích Itálie.
            </p>

            {/* Social media monochrome icons */}
            <div className="pt-1 flex items-center space-x-3 text-[#E4D9C8]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[#FAF8F4]/5 border border-[#E4D9C8]/20 rounded-full hover:bg-[#7A4B32] hover:border-[#7A4B32] hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[#FAF8F4]/5 border border-[#E4D9C8]/20 rounded-full hover:bg-[#7A4B32] hover:border-[#7A4B32] hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2 (2 cols): Navigation & Categories */}
          <div className="lg:col-span-2 space-y-2.5">
            <h4 className="font-serif text-xs text-[#E4D9C8] tracking-wider uppercase border-b border-[#FAF8F4]/15 pb-1.5 font-semibold">
              Kolekce
            </h4>
            <ul className="space-y-1.5 text-xs text-[#FAF8F4]/80 font-light">
              <li>
                <Link href="/produkty" className="hover:text-[#E4D9C8] transition-colors">
                  Všechny kolekce
                </Link>
              </li>
              <li>
                <Link href="/produkty/saty" className="hover:text-[#E4D9C8] transition-colors">
                  Šaty
                </Link>
              </li>
              <li>
                <Link href="/produkty/halenky-a-kosile" className="hover:text-[#E4D9C8] transition-colors">
                  Halenky
                </Link>
              </li>
              <li>
                <Link href="/produkty/svetry-a-kardigany" className="hover:text-[#E4D9C8] transition-colors">
                  Svetry
                </Link>
              </li>
              <li>
                <Link href="/produkty/darkove-poukazy" className="hover:text-[#E4D9C8] transition-colors text-[#E4D9C8] font-medium">
                  Poukazy
                </Link>
              </li>
              <li>
                <Link href="/o-mne" className="hover:text-[#E4D9C8] transition-colors">
                  O mně
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 (3 cols): Customer Service & Legal */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="font-serif text-xs text-[#E4D9C8] tracking-wider uppercase border-b border-[#FAF8F4]/15 pb-1.5 font-semibold">
              Zákaznický Servis
            </h4>
            <ul className="space-y-1.5 text-xs text-[#FAF8F4]/80 font-light">
              <li>
                <Link href="/doprava-a-platba" className="hover:text-[#E4D9C8] transition-colors">
                  Doprava a platba
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-[#E4D9C8] transition-colors">
                  Kontakt &amp; Prodejna
                </Link>
              </li>
              <li>
                <Link href="/obchodni-podminky" className="hover:text-[#E4D9C8] transition-colors">
                  Obchodní podmínky
                </Link>
              </li>
              <li>
                <Link href="/ochrana-osobnich-udaju" className="hover:text-[#E4D9C8] transition-colors">
                  Ochrana údajů (GDPR)
                </Link>
              </li>
              <li>
                <Link href="/reklamacni-rad" className="hover:text-[#E4D9C8] transition-colors">
                  Reklamační řád
                </Link>
              </li>
              <li>
                {/* Permanent GDPR Cookie Settings Trigger Button */}
                <button
                  onClick={onOpenCookieSettings}
                  className="hover:text-[#E4D9C8] transition-colors text-left underline underline-offset-2 text-[#E4D9C8] font-medium"
                >
                  Nastavení cookies
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4 (3 cols): Newsletter Signup */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="font-serif text-xs text-[#E4D9C8] tracking-wider uppercase border-b border-[#FAF8F4]/15 pb-1.5 font-semibold">
              Inspirace Do Schránky
            </h4>
            <p className="text-xs text-[#FAF8F4]/80 leading-relaxed font-light">
              Získejte přístup k novým italským kolekcím a akciím.
            </p>

            {subscribed ? (
              <div className="p-2.5 bg-[#7A4B32]/30 border border-[#7A4B32] rounded-xl text-xs text-[#FAF8F4] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E4D9C8] fill-[#E4D9C8]" />
                <span>Přihlášení proběhlo úspěšně!</span>
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
                    className="w-full bg-[#FAF8F4]/10 border border-[#E4D9C8]/30 rounded-full py-1.5 pl-3.5 pr-9 text-xs text-[#FAF8F4] placeholder-[#FAF8F4]/50 focus:outline-none focus:border-[#E4D9C8]"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 p-1 bg-[#7A4B32] hover:bg-[#633B26] text-white rounded-full transition-colors"
                    aria-label="Odeslat newsletter"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-[#FAF8F4]/60 font-light">
                  Bez spamu. Odběr zrušíte 1 klikem.
                </p>
              </form>
            )}
          </div>

        </div>

        {/* Compact Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FAF8F4]/60 font-light text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} LINDA FASHION s.r.o. Všechna práva vyhrazena.</p>
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-[#E4D9C8]">
            <span className="px-2 py-0.5 bg-[#FAF8F4]/5 rounded border border-[#E4D9C8]/20">GoPay</span>
            <span className="px-2 py-0.5 bg-[#FAF8F4]/5 rounded border border-[#E4D9C8]/20">QR Platba</span>
            <span className="px-2 py-0.5 bg-[#FAF8F4]/5 rounded border border-[#E4D9C8]/20">Zásilkovna / PPL</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
