'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Facebook, Instagram } from 'lucide-react';
import { poslatJson } from '@/lib/api-klient';

interface FooterProps {
  onOpenCookieSettings?: () => void;
  /** Odkazy na sociální sítě spravuje admin (sekce 6.8) – nejsou natvrdo v kódu. */
  socialInstagram?: string | null;
  socialFacebook?: string | null;
}

/* Kategorie přes vlastní cestu, ne přes `?kategorie=` – viz komentář
   u `NAV_LINKS` v Header.tsx (přednačítání `<Link>` jde po cestě). */
const KOLEKCE_ODKAZY = [
  { href: '/produkty', label: 'Všechny kolekce' },
  { href: '/produkty/saty', label: 'Šaty' },
  { href: '/produkty/halenky-a-kosile', label: 'Halenky' },
  { href: '/produkty/svetry-a-kardigany', label: 'Svetry' },
  { href: '/produkty/darkove-poukazy', label: 'Poukazy' },
  { href: '/o-mne', label: 'O mně' },
];

/* „Odstoupit od smlouvy" je v patičce kvůli § 1830a o. z.: funkce pro
   odstoupení musí být **snadno dostupná** z prostředí, kde smlouva vznikla.
   Odkaz schovaný v obchodních podmínkách tu podmínku nesplňuje – patička je
   na každé stránce obchodu a nevyžaduje přihlášení. */
const SERVIS_ODKAZY = [
  { href: '/doprava-a-platba', label: 'Doprava a platba' },
  { href: '/kontakt', label: 'Kontakt a prodejna' },
  { href: '/obchodni-podminky', label: 'Obchodní podmínky' },
  { href: '/ochrana-osobnich-udaju', label: 'Ochrana údajů' },
  { href: '/reklamacni-rad', label: 'Reklamační řád' },
  { href: '/reklamace', label: 'Reklamovat zboží' },
  { href: '/odstoupeni', label: 'Odstoupit od smlouvy' },
];

/**
 * Ikona se zobrazí jen tehdy, když má majitelka odkaz vyplněný v administraci.
 * Prázdný profil je horší než žádný – odkaz na obecné instagram.com nikam nevede.
 */
function sestavitSite(instagram?: string | null, facebook?: string | null) {
  return [
    instagram?.trim() ? { href: instagram.trim(), label: 'Instagram', Ikona: Instagram } : null,
    facebook?.trim() ? { href: facebook.trim(), label: 'Facebook', Ikona: Facebook } : null,
  ].filter((s): s is { href: string; label: string; Ikona: typeof Instagram } => s !== null);
}

/** Skupina odkazů: štítek nad, odkazy pod ním do šířky. */
const SkupinaOdkazu: React.FC<{
  nadpis: string;
  odkazy: { href: string; label: string }[];
  children?: React.ReactNode;
}> = ({ nadpis, odkazy, children }) => (
  <div>
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-sand">
      {nadpis}
    </h2>
    <ul className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-linda-cream/75">
      {odkazy.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            className="inline-flex items-center py-1 transition-colors hover:text-linda-sand"
          >
            {label}
          </Link>
        </li>
      ))}
      {children}
    </ul>
  </div>
);

/**
 * Patička.
 *
 * Fotografická textura šla pryč – pod drobným písmem snižovala čitelnost
 * a patička kvůli ní působila těžce. Podklad je teď plná čokoládová barva,
 * hloubku dělá jen vlasová linka nahoře s přechodem do koňaku.
 *
 * Výška je hlavní požadavek: značka, odkazy i newsletter sdílejí jeden řádek,
 * odkazy se sázejí vodorovně místo do vysokých sloupců a sociální ikony sedí
 * ve spodní liště u copyrightu. Oproti původnímu rozvržení je patička zhruba
 * o polovinu nižší.
 */
export const Footer: React.FC<FooterProps> = ({
  onOpenCookieSettings,
  socialInstagram,
  socialFacebook,
}) => {
  const site = sestavitSite(socialInstagram, socialFacebook);

  const [email, setEmail] = useState('');
  const [stav, setStav] = useState<'klid' | 'odesilam' | 'hotovo'>('klid');
  const [chyba, setChyba] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || stav === 'odesilam') return;

    setStav('odesilam');
    setChyba(null);

    const vysledek = await poslatJson<{ zprava: string }>('/api/newsletter', {
      email,
      zdroj: 'paticka',
    });

    if (vysledek.ok) {
      setStav('hotovo');
      setEmail('');
    } else {
      setChyba(vysledek.pole?.email ?? vysledek.chyba);
      setStav('klid');
    }
  };

  return (
    <footer className="relative bg-linda-chocolate text-linda-cream">
      {/* Vlasová linka místo bývalé fotografické textury */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-linda-cognac to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 pb-4 pt-7 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-12">
          {/* Značka */}
          <div className="lg:col-span-3">
            <Link href="/" className="group inline-block">
              <span className="block font-serif text-xl font-medium uppercase tracking-[0.18em] text-linda-sand transition-colors group-hover:text-white">
                LINDA FASHION
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.35em] text-linda-sand/75">
                Moda Italiana
              </span>
            </Link>

            <p className="mt-2 max-w-xs text-xs leading-relaxed text-linda-cream/75">
              Kousky vybírané osobně na cestách po Itálii.
            </p>
          </div>

          {/* Odkazy – vodorovně, ať nerostou do výšky */}
          <nav aria-label="Odkazy v patičce" className="space-y-3 lg:col-span-6">
            <SkupinaOdkazu nadpis="Kolekce" odkazy={KOLEKCE_ODKAZY} />
            <SkupinaOdkazu nadpis="Servis" odkazy={SERVIS_ODKAZY}>
              <li>
                <button
                  type="button"
                  onClick={onOpenCookieSettings}
                  className="inline-flex cursor-pointer items-center py-1 text-linda-sand underline underline-offset-2 transition-colors hover:text-white"
                >
                  Nastavení cookies
                </button>
              </li>
            </SkupinaOdkazu>
          </nav>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            {/* Nadpis zároveň pojmenovává pole (aria-labelledby), takže popisek
                nese viditelný text – ne placeholder – a nestojí řádek navíc. */}
            <h2
              id="newsletter-paticka-nadpis"
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-sand"
            >
              Novinky do schránky
            </h2>

            {stav === 'hotovo' ? (
              <p
                role="status"
                className="mt-2 rounded-xl bg-linda-cognac/30 px-3 py-2 text-xs text-linda-cream shadow-neuOnDarkInset"
              >
                Děkujeme, přihlášku jsme zaevidovali.
              </p>
            ) : (
              <form onSubmit={(e) => void handleSubscribe(e)} className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    id="newsletter-paticka"
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={stav === 'odesilam'}
                    aria-labelledby="newsletter-paticka-nadpis"
                    aria-invalid={chyba ? true : undefined}
                    aria-describedby={
                      chyba ? 'newsletter-paticka-chyba' : 'newsletter-paticka-info'
                    }
                    placeholder="vas@email.cz"
                    /* Prohlubeň i na tmavém: čokoládu vytvaruje černý stín,
                       přísvit je jen 5% bílé – víc by na hnědé bylo mléko.
                       Placeholder zvednut z /45 na /60 kvůli kontrastu. */
                    className="min-h-touch w-full min-w-0 flex-1 rounded-full bg-black/15 px-4 text-xs text-linda-cream shadow-neuOnDarkInset transition-shadow placeholder:text-linda-cream/60"
                  />
                  <button
                    type="submit"
                    disabled={stav === 'odesilam'}
                    aria-label="Přihlásit se k odběru novinek"
                    className="group flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-full bg-linda-cognac text-white shadow-neuOnDark transition-all duration-200 hover:bg-linda-cognacHover active:shadow-none disabled:opacity-60"
                  >
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {chyba && (
                  <p
                    id="newsletter-paticka-chyba"
                    role="alert"
                    /* Na čokoládě je červená nečitelná – písek s tučným řezem
                       drží kontrast i význam. */
                    className="mt-1.5 text-[11px] font-semibold text-linda-sand"
                  >
                    {chyba}
                  </p>
                )}

                <p id="newsletter-paticka-info" className="mt-1.5 text-[11px] text-linda-cream/60">
                  Bez spamu.{' '}
                  <Link
                    href="/ochrana-osobnich-udaju"
                    className="underline underline-offset-2 transition-colors hover:text-linda-sand"
                  >
                    Zpracování údajů
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Spodní lišta */}
        <div className="mt-5 flex flex-col items-center gap-3 border-t border-linda-cream/10 pt-3 text-center text-[11px] text-linda-cream/60 sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            {site.map(({ href, label, Ikona }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} – LINDA FASHION`}
                /* Nadzvednutí o 2 px. Na tmavé patičce nese reliéf hlavně
                   černý stín, takže samotná změna stínu je při najetí sotva
                   znát – posun ji doplní o pohyb, který oko zaregistruje. */
                className="group flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-white/[0.04] text-linda-sand shadow-neuOnDark transition-all duration-200 hover:-translate-y-0.5 hover:bg-linda-cognac hover:text-white active:translate-y-0 active:shadow-neuOnDarkInset"
              >
                <Ikona
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:scale-110"
                  aria-hidden="true"
                />
              </a>
            ))}
            <p className="ml-1 text-left">
              &copy; {new Date().getFullYear()} LINDA FASHION s.r.o.
            </p>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-linda-sand/85">
            {['GoPay', 'QR platba', 'Zásilkovna', 'PPL'].map((sluzba) => (
              <li
                key={sluzba}
                className="rounded-md bg-white/[0.04] px-2 py-1 shadow-neuOnDark"
              >
                {sluzba}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};
