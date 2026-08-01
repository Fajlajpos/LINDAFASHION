'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MediaFrame } from './MediaFrame';

type StavOdeslani = 'klid' | 'odesilam' | 'hotovo';

/**
 * Sekce s přihlášením k newsletteru: vlevo fotografie, vpravo formulář.
 *
 * Endpoint pro newsletter zatím v aplikaci není, formulář proto nic neodesílá –
 * jen potvrdí, že jsme přihlášku přijali. Text je schválně opatrný, ať uživateli
 * netvrdíme odběr, který nikde nevznikl.
 */
export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [stav, setStav] = useState<StavOdeslani>('klid');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // TODO: Před spuštěním napojit na skutečný endpoint (POST /api/newsletter)
    // – včetně ošetření chyby a duplicitního e-mailu. Zatím jen lokální stav.
    setStav('odesilam');
    window.setTimeout(() => {
      setStav('hotovo');
      setEmail('');
    }, 400);
  };

  const odesilam = stav === 'odesilam';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Zapuštěný, ne vyvýšený: newsletter je servisní blok, ne zboží.
          Viz `TrustBar` – reliéf na stránce nese hierarchii. */}
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-linda-sandLight shadow-neuInset lg:grid-cols-12">
        {/* Obrazová část – dokud fotka chybí, drží plochu velká ilustrace. */}
        <div className="relative min-h-[220px] lg:col-span-4 lg:min-h-[340px]">
          {/* Jiná silueta než u promo banneru výš – ať se stejná ilustrace
              neopakuje dvakrát na jedné obrazovce. */}
          <MediaFrame src={null} glyph="svetry" alt="" sizes="(max-width: 1024px) 100vw, 33vw" />
        </div>

        {/* Formulářová část */}
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-12 lg:col-span-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-linda-espresso/70">
            Získejte 10 % na první nákup
          </span>

          <h2 className="font-serif text-3xl leading-[1.15] text-linda-espresso sm:text-[2.6rem]">
            Přidejte se k newsletteru
          </h2>

          <p className="max-w-lg text-sm text-linda-espresso/70">
            Novinky z italských dílen, přednostní přístup ke kolekcím a tipy na styling.
            Odhlásit se můžete kdykoli.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {/* Viditelný popisek – placeholder je jen doplněk, ne náhrada labelu. */}
            <label
              htmlFor="newsletter-email"
              className="text-xs font-medium text-linda-espresso"
            >
              E-mailová adresa
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                aria-describedby="newsletter-souhlas"
                /* Pole je prohlubeň ve stejné barvě jako panel – tvar sám říká
                   „sem se píše“, rámeček by ho jen zdvojil. Placeholder je
                   zesvětlený jen na /55; /40 by na písku spadl pod 4,5:1.
                   Prstenec fokusu řeší globální `:focus-visible` v globals.css
                   a inset stín přebije, takže je i tady dobře vidět. */
                className="min-h-touch flex-1 rounded-full bg-linda-sandLight px-5 text-sm text-linda-espresso shadow-neuInsetSm transition-shadow placeholder:text-linda-espresso/55"
              />
              <button
                type="submit"
                disabled={odesilam}
                className="min-h-touch cursor-pointer rounded-full bg-linda-espresso px-8 text-sm font-medium text-linda-cream shadow-neuDark transition-all duration-200 hover:bg-linda-cognac active:shadow-neuSm disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-neuSm"
              >
                {odesilam ? 'Odesílám…' : 'Odebírat'}
              </button>
            </div>
          </form>

          {/* Potvrzení čte i odečítač obrazovky, formulář kvůli němu nemizí. */}
          <p aria-live="polite" className="min-h-[1.25rem] text-sm text-linda-cognac">
            {stav === 'hotovo' ? 'Děkujeme, přihlášku jsme přijali. Ozveme se s první novinkou.' : ''}
          </p>

          <p id="newsletter-souhlas" className="text-xs text-linda-espresso/70">
            Odesláním souhlasíte se{' '}
            <Link
              href="/ochrana-osobnich-udaju"
              className="underline underline-offset-2 transition-colors hover:text-linda-cognac"
            >
              zpracováním osobních údajů
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
