'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Settings, X, Check } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytical: boolean;
  marketing: boolean;
}

interface CookieBannerProps {
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  isOpenExternal,
  onCloseExternal,
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    analytical: true,
    marketing: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('linda_cookie_consent');
    if (!saved && !isOpenExternal) {
      setShowBanner(true);
    }
  }, [isOpenExternal]);

  useEffect(() => {
    if (isOpenExternal) {
      setShowSettingsModal(true);
    }
  }, [isOpenExternal]);

  const saveConsent = (preferences: CookiePreferences) => {
    localStorage.setItem('linda_cookie_consent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettingsModal(false);
    if (onCloseExternal) onCloseExternal();

    // Trigger Meta Pixel loading if marketing consented
    if (preferences.marketing && typeof window !== 'undefined') {
      console.log('⚡ Marketingové cookies schváleny - aktivuji Meta Pixel');
    }
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytical: true, marketing: true });
  };

  const handleRejectOptional = () => {
    saveConsent({ necessary: true, analytical: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent(prefs);
  };

  if (!showBanner && !showSettingsModal) return null;

  return (
    <>
      {/* Banner na spodním okraji obrazovky při první návštěvě */}
      {showBanner && !showSettingsModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-[#2B2019] text-[#FAF8F4] border-t-2 border-[#7A4B32] shadow-elevated animate-slideUp">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 max-w-3xl">
              <ShieldCheck className="w-6 h-6 text-[#E4D9C8] flex-shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-[#E4D9C8]">Ochrana vašeho soukromí &amp; Cookies</h4>
                <p className="text-xs text-[#FAF8F4]/80 leading-relaxed">
                  Tento e-shop používá soubory cookies pro zajištění správného fungování košíku a přihlášení (nezbytné), pro analýzu návštěvnosti a pro přizpůsobení nabídek italské módy (marketingové). Detaily najdete v našich{' '}
                  <Link href="/cookies" className="underline underline-offset-2 text-[#E4D9C8]">
                    zásadách používání cookies
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 text-xs font-medium border border-[#E4D9C8]/40 rounded-full hover:bg-[#FAF8F4]/10 transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Nastavení
              </button>
              <button
                onClick={handleRejectOptional}
                className="px-4 py-2 text-xs font-medium border border-[#E4D9C8] rounded-full hover:bg-[#FAF8F4]/10 transition-colors"
              >
                Pouze nezbytné
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2 text-xs font-semibold bg-[#7A4B32] text-white rounded-full hover:bg-[#633B26] transition-colors shadow-sm"
              >
                Povolit vše
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal s detailním nastavením kategorií */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FAF8F4] text-[#2B2019] rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-elevated border border-[#E4D9C8] space-y-6 relative">
            <button
              onClick={() => {
                setShowSettingsModal(false);
                if (onCloseExternal) onCloseExternal();
              }}
              className="absolute top-4 right-4 p-2 text-[#2B2019]/60 hover:text-[#7A4B32]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-serif text-2xl text-[#2B2019]">Nastavení souborů cookies</h3>
              <p className="text-xs text-[#2B2019]/70 mt-1">
                Zde můžete udělit nebo odvolat souhlas s jednotlivými typy souborů cookies.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Technické / Nezbytné */}
              <div className="p-4 bg-white rounded-xl border border-[#E4D9C8]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#2B2019]">Technické &amp; Nezbytné (Povinné)</h4>
                  <p className="text-[#2B2019]/60 mt-0.5">Potřebné pro košík, autentizaci a bezpečnost webu.</p>
                </div>
                <input type="checkbox" checked disabled className="w-4 h-4 accent-[#7A4B32] cursor-not-allowed" />
              </div>

              {/* Analytické */}
              <div className="p-4 bg-white rounded-xl border border-[#E4D9C8]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#2B2019]">Analytické cookies</h4>
                  <p className="text-[#2B2019]/60 mt-0.5">Pomáhají nám anonymně měřit návštěvnost a zlepšovat web.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytical}
                  onChange={(e) => setPrefs({ ...prefs, analytical: e.target.checked })}
                  className="w-4 h-4 accent-[#7A4B32] cursor-pointer"
                />
              </div>

              {/* Marketingové */}
              <div className="p-4 bg-white rounded-xl border border-[#E4D9C8]/60 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#2B2019]">Marketingové cookies (Meta Pixel)</h4>
                  <p className="text-[#2B2019]/60 mt-0.5">Slouží k zobrazování relevantních reklam z italské módy.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                  className="w-4 h-4 accent-[#7A4B32] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4D9C8]">
              <button
                onClick={handleSaveCustom}
                className="px-6 py-2.5 bg-[#7A4B32] text-white text-xs font-medium rounded-full hover:bg-[#633B26] transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Uložit mé předvolby
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
