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
        <div className="animate-fadeInUp fixed bottom-0 left-0 right-0 z-50 bg-linda-espresso p-4 text-linda-cream shadow-neuBarRaised sm:p-6">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex max-w-3xl items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-linda-sand" aria-hidden="true" />
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-linda-sand">Ochrana vašeho soukromí &amp; Cookies</h4>
                <p className="text-xs leading-relaxed text-linda-cream/80">
                  Tento e-shop používá soubory cookies pro zajištění správného fungování košíku a přihlášení (nezbytné), pro analýzu návštěvnosti a pro přizpůsobení nabídek italské módy (marketingové). Detaily najdete v našich{' '}
                  <Link href="/cookies" className="text-linda-sand underline underline-offset-2">
                    zásadách používání cookies
                  </Link>.
                </p>
              </div>
            </div>

            {/* Rámečky nahradil reliéf; `min-h-touch` doplňuje dřív chybějící
                44px dotykový cíl (tlačítka měla přes `py-2` jen ~32 px). */}
            <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.04] px-4 text-xs font-medium text-linda-cream shadow-neuOnDark transition-all duration-200 hover:bg-white/10 active:shadow-neuOnDarkInset"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Nastavení
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="min-h-touch cursor-pointer rounded-full bg-white/[0.04] px-4 text-xs font-medium text-linda-cream shadow-neuOnDark transition-all duration-200 hover:bg-white/10 active:shadow-neuOnDarkInset"
              >
                Pouze nezbytné
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="min-h-touch cursor-pointer rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuOnDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuOnDarkInset"
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
          <div className="relative w-full max-w-lg space-y-6 rounded-2xl bg-linda-cream p-6 text-linda-espresso shadow-neuLg sm:p-8">
            <button
              type="button"
              onClick={() => {
                setShowSettingsModal(false);
                if (onCloseExternal) onCloseExternal();
              }}
              aria-label="Zavřít nastavení cookies"
              className="absolute right-4 top-4 flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/70 shadow-neuSm transition-all duration-200 hover:text-linda-cognac active:shadow-neuInsetSm"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div>
              <h3 className="font-serif text-2xl text-linda-espresso">Nastavení souborů cookies</h3>
              <p className="mt-1 text-xs text-linda-espresso/70">
                Zde můžete udělit nebo odvolat souhlas s jednotlivými typy souborů cookies.
              </p>
            </div>

            {/* Každá kategorie je vyfrézovaná prohlubeň v krémové ploše –
                stejný jazyk jako vstupní pole na zbytku webu. */}
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                <div>
                  <h4 className="text-sm font-semibold text-linda-espresso">Technické &amp; Nezbytné (Povinné)</h4>
                  <p className="mt-0.5 text-linda-espresso/70">Potřebné pro košík, autentizaci a bezpečnost webu.</p>
                </div>
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label="Technické a nezbytné cookies – nelze vypnout"
                  className="h-4 w-4 shrink-0 cursor-not-allowed accent-linda-cognac"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                <div>
                  <h4 className="text-sm font-semibold text-linda-espresso">Analytické cookies</h4>
                  <p className="mt-0.5 text-linda-espresso/70">Pomáhají nám anonymně měřit návštěvnost a zlepšovat web.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytical}
                  onChange={(e) => setPrefs({ ...prefs, analytical: e.target.checked })}
                  aria-label="Analytické cookies"
                  className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                <div>
                  <h4 className="text-sm font-semibold text-linda-espresso">Marketingové cookies (Meta Pixel)</h4>
                  <p className="mt-0.5 text-linda-espresso/70">Slouží k zobrazování relevantních reklam z italské módy.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                  aria-label="Marketingové cookies"
                  className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Uložit mé předvolby
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
