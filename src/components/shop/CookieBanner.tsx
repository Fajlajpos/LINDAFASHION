'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Settings, X, Check } from 'lucide-react';
import {
  VYCHOZI_SOUHLAS,
  nacistSouhlas,
  nastaveneKategorie,
  odeslatSouhlasNaServer,
  smazatSledovaciCookies,
  ulozitSouhlas,
  type SouhlasCookies,
} from '@/lib/souhlas-cookies';

/* Konstanta modulu, ne stav: `NEXT_PUBLIC_*` je vložené při buildu, za běhu
   se nemění. */
const NASTAVENO = nastaveneKategorie();
const NECO_VOLITELNEHO = NASTAVENO.analyticke || NASTAVENO.marketingove;

/** Věta pro lištu – jen o nástrojích, které opravdu běží. */
function popisVolitelnych(): string {
  const casti: string[] = [];
  if (NASTAVENO.analyticke) casti.push('měříme návštěvnost přes Google Analytics');
  if (NASTAVENO.marketingove) {
    casti.push('měříme účinnost reklam na Facebooku a Instagramu přes Meta Pixel');
  }
  return casti.join(' a ');
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

  // Volitelné kategorie startují VYPNUTÉ. Dřív tu bylo `analytical: true,
  // marketing: true` – předzaškrtnutý souhlas GDPR neuznává a zadání ho
  // v sekci 11 výslovně zakazuje.
  const [prefs, setPrefs] = useState<SouhlasCookies>(VYCHOZI_SOUHLAS);

  useEffect(() => {
    const ulozeny = nacistSouhlas();

    // Lišta se ukáže jen tomu, kdo ještě nerozhodl – a jen když je vůbec
    // o čem rozhodovat. Bez GA i Pixelu web nic volitelného neukládá.
    if (!ulozeny && !isOpenExternal && NECO_VOLITELNEHO) {
      setShowBanner(true);
    }

    // Kdo už rozhodl a otevírá nastavení znovu, uvidí své skutečné volby.
    if (ulozeny) setPrefs(ulozeny);
  }, [isOpenExternal]);

  useEffect(() => {
    if (isOpenExternal) {
      setShowSettingsModal(true);
    }
  }, [isOpenExternal]);

  const saveConsent = (volba: SouhlasCookies) => {
    const predchozi = nacistSouhlas();

    // Souhlasit jde jen s tím, co běží – stejné maskování jako v `ulozitSouhlas`,
    // aby evidence na serveru neříkala víc než prohlížeč.
    const souhlas: SouhlasCookies = {
      nezbytne: true,
      analyticke: NASTAVENO.analyticke && volba.analyticke,
      marketingove: NASTAVENO.marketingove && volba.marketingove,
    };

    ulozitSouhlas(souhlas);

    /*
     * Evidence na serveru (čl. 7 odst. 1 GDPR).
     *
     * `localStorage` drží souhlas u zákaznice, ale doložit ho musí správce –
     * a co si zákaznice sama smaže, to důkaz není. Volá se **po** uložení
     * do prohlížeče a nic se na ně nečeká: lišta musí zavřít hned.
     */
    odeslatSouhlasNaServer(souhlas);

    setPrefs(souhlas);
    setShowBanner(false);
    setShowSettingsModal(false);
    if (onCloseExternal) onCloseExternal();

    /*
     * Odvolání musí platit hned, ne až při příští návštěvě.
     *
     * Jednou načtený GA4 a Pixel v otevřené stránce zůstanou, i když je
     * `AnalytickeSkripty` přestane vykreslovat – `next/script` skript
     * neodnačte. GA4 navíc sám hlásí přechody mezi stránkami (pushState),
     * takže po kliknutí na „Pouze nezbytné" měřil dál a smazanou `_ga` si
     * při dalším přechodu založil znovu. Odvolání tak bylo jen naoko.
     *
     * Jediný spolehlivý konec obou knihoven je zahodit stránku: smazat
     * cookies a načíst ji znovu – už bez skriptů. Záznam pro evidenci odchází
     * s `keepalive`, takže ho znovunačtení nezruší.
     */
    const odvolano =
      (predchozi?.analyticke && !souhlas.analyticke) ||
      (predchozi?.marketingove && !souhlas.marketingove);

    if (odvolano) {
      smazatSledovaciCookies();
      window.location.reload();
    }
  };

  const handleAcceptAll = () => {
    saveConsent({ nezbytne: true, analyticke: true, marketingove: true });
  };

  const handleRejectOptional = () => {
    saveConsent(VYCHOZI_SOUHLAS);
  };

  const handleSaveCustom = () => {
    saveConsent(prefs);
  };

  if (!showBanner && !showSettingsModal) return null;

  return (
    <>
      {/* Banner na spodním okraji obrazovky při první návštěvě */}
      {showBanner && !showSettingsModal && (
        <div className="animate-fadeInUp fixed bottom-0 left-0 right-0 z-50 bg-linda-espresso p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-linda-cream shadow-neuBarRaised sm:p-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex max-w-3xl items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-linda-sand" aria-hidden="true" />
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-linda-sand">Ochrana vašeho soukromí &amp; Cookies</h4>
                <p className="text-xs leading-relaxed text-linda-cream/80">
                  Nezbytné soubory pro košík a přihlášení používáme vždy. S vaším souhlasem navíc{' '}
                  {popisVolitelnych()}. Souhlas můžete kdykoliv odvolat v patičce webu. Podrobnosti
                  najdete v{' '}
                  <Link href="/cookies" className="text-linda-sand underline underline-offset-2">
                    zásadách používání cookies
                  </Link>
                  .
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
              {/* Odmítnutí vypadá přesně jako souhlas. Dřív bylo skoro průhledné
                  vedle plného koňakového „Povolit vše" – takové postrčení
                  k souhlasu dozorové úřady (EDPB, ÚOOÚ) hodnotí jako
                  zavádějící design a souhlas získaný přes něj jako nesvobodný. */}
              <button
                type="button"
                onClick={handleRejectOptional}
                className="min-h-touch cursor-pointer rounded-full bg-linda-cognac px-5 text-xs font-semibold text-white shadow-neuOnDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuOnDarkInset"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative my-auto w-full max-w-lg space-y-6 rounded-2xl bg-linda-cream p-6 text-linda-espresso shadow-neuFloat sm:p-8">
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
                {NECO_VOLITELNEHO
                  ? 'Zde můžete udělit nebo odvolat souhlas s jednotlivými typy souborů cookies. Odvolání platí okamžitě.'
                  : 'Tento e-shop teď nepoužívá žádné analytické ani marketingové nástroje, jen nezbytné soubory pro košík a přihlášení. Není tedy s čím souhlasit.'}
              </p>
            </div>

            {/* Každá kategorie je vyfrézovaná prohlubeň v krémové ploše –
                stejný jazyk jako vstupní pole na zbytku webu. */}
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                {/* `span`, ne `h4`: globální styl nadpisů ho dělal patkovým,
                    zatímco obě volitelné kategorie pod ním jsou bezpatkové. */}
                <div>
                  <span className="block text-sm font-semibold text-linda-espresso">Nezbytné (vždy zapnuté)</span>
                  <p className="mt-0.5 text-linda-espresso/70">
                    Košík, oblíbené, přihlášení a zapamatování vaší volby. Bez nich web nefunguje,
                    proto souhlas nepotřebují.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label="Technické a nezbytné cookies – nelze vypnout"
                  className="h-4 w-4 shrink-0 cursor-not-allowed accent-linda-cognac"
                />
              </div>

              {/* Celý řádek je `<label>`: samotné zaškrtávátko měří 16 px, což
                  je třetina dotykového minima. Souhlas se má dát potvrdit
                  napoprvé, ne po třetím pokusu. */}
              {/* „Anonymně" tu stálo neprávem: GA4 pracuje s identifikátorem
                  v cookie `_ga`, data jsou pseudonymní. Souhlas daný na
                  nepravdivou informaci není informovaný (čl. 4 bod 11 GDPR). */}
              {NASTAVENO.analyticke && (
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                  <span>
                    <span className="block text-sm font-semibold text-linda-espresso">Analytické cookies (Google Analytics)</span>
                    <span className="mt-0.5 block text-linda-espresso/70">
                      Měří, jak se web používá, abychom ho mohli zlepšovat. Google vám přidělí
                      identifikátor a data mohou být předána do USA.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.analyticke}
                    onChange={(e) => setPrefs({ ...prefs, analyticke: e.target.checked })}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
                  />
                </label>
              )}

              {NASTAVENO.marketingove && (
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-linda-sandLight p-4 shadow-neuInsetSm">
                  <span>
                    <span className="block text-sm font-semibold text-linda-espresso">Marketingové cookies (Meta Pixel)</span>
                    <span className="mt-0.5 block text-linda-espresso/70">
                      Měří účinnost našich reklam na Facebooku a Instagramu a umožní vám je
                      zobrazit. Údaje získává i Meta a mohou být předány do USA.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.marketingove}
                    onChange={(e) => setPrefs({ ...prefs, marketingove: e.target.checked })}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-linda-cognac"
                  />
                </label>
              )}
            </div>

            <p className="text-xs text-linda-espresso/70">
              Seznam všech souborů a doby jejich uložení najdete v{' '}
              <Link href="/cookies" className="font-semibold text-linda-cognac underline underline-offset-2">
                zásadách používání cookies
              </Link>
              .
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              {NECO_VOLITELNEHO ? (
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Uložit mé předvolby
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    if (onCloseExternal) onCloseExternal();
                  }}
                  className="flex min-h-touch cursor-pointer items-center gap-2 rounded-full bg-linda-cognac px-6 text-xs font-medium text-white shadow-neuDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-neuSm"
                >
                  Zavřít
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
