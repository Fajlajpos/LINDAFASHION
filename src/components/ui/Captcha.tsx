'use client';

import React, { useEffect, useId, useRef } from 'react';

/**
 * Widget Cloudflare Turnstile.
 *
 * Vykreslí se **jen když má e-shop klíče** – bez nich je `siteKey` prázdný
 * a komponenta nevrátí nic. To je podstatné: serverové ověření
 * ([captcha.ts](src/lib/captcha.ts)) bez klíče propouští, takže obě poloviny
 * se zapínají a vypínají společně. Kdyby se ověření zapnulo dřív než widget,
 * vyplnění `.env` by zavřelo každý formulář na webu – přesně ta past, kdy
 * nastavení věci zhorší.
 *
 * Token předává nahoru přes `onToken`. Platí jednou a pár minut, takže se po
 * neúspěšném odeslání musí widget resetovat – od toho je `resetSignal`:
 * změna hodnoty vynutí nový token.
 */

interface TurnstileApi {
  render: (
    prvek: HTMLElement,
    volby: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      theme: 'light' | 'dark' | 'auto';
      language: string;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const ADRESA_SKRIPTU = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Skript se načítá jednou pro celou stránku, i když je widgetů víc. */
let nacitani: Promise<void> | null = null;

function nacistSkript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  if (!nacitani) {
    nacitani = new Promise<void>((splnit, odmitnout) => {
      const existujici = document.querySelector<HTMLScriptElement>(`script[src="${ADRESA_SKRIPTU}"]`);

      if (existujici) {
        existujici.addEventListener('load', () => splnit());
        existujici.addEventListener('error', () => odmitnout(new Error('Turnstile se nenačetl.')));
        return;
      }

      const skript = document.createElement('script');
      skript.src = ADRESA_SKRIPTU;
      skript.async = true;
      skript.defer = true;
      skript.onload = () => splnit();
      skript.onerror = () => odmitnout(new Error('Turnstile se nenačetl.'));
      document.head.appendChild(skript);
    });

    // Ať další pokus zkusí načtení znovu místo čekání na odmítnutou promise.
    nacitani.catch(() => {
      nacitani = null;
    });
  }

  return nacitani;
}

interface Props {
  /** Veřejný klíč ze serveru. Prázdný/`null` = captcha je vypnutá. */
  siteKey: string | null;
  onToken: (token: string | null) => void;
  /** Změna hodnoty vyžádá nový token (po neúspěšném odeslání formuláře). */
  resetSignal?: number;
}

export function Captcha({ siteKey, onToken, resetSignal = 0 }: Props) {
  const kontejner = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const popis = useId();

  // `onToken` v ref, ať překreslení rodiče nevynutí nový widget – ten by
  // pokaždé začal od nuly a zákaznice by ověřovala znovu a znovu.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !kontejner.current) return;

    let zruseno = false;
    const prvek = kontejner.current;

    void nacistSkript()
      .then(() => {
        if (zruseno || !window.turnstile) return;

        widgetId.current = window.turnstile.render(prvek, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          // Token vypršel dřív, než zákaznice formulář odeslala.
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          theme: 'light',
          language: 'cs',
        });
      })
      .catch((err) => {
        /*
         * Nenačtený skript formulář nezablokuje. Serverové ověření výpadek
         * ověřovací služby propouští, takže odeslání projde – a zákaznice
         * neuvízne u prvku, který se nikdy nevykreslí.
         */
        console.error('[captcha] Widget se nepodařilo načíst:', err);
        onTokenRef.current(null);
      });

    return () => {
      zruseno = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onTokenRef.current(null);
    }
  }, [resetSignal]);

  if (!siteKey) return null;

  return (
    <div className="space-y-1.5">
      <div ref={kontejner} aria-describedby={popis} />
      <p id={popis} className="text-[11px] leading-relaxed text-linda-espresso/70">
        Formulář chrání Cloudflare Turnstile proti automatickému odesílání.
      </p>
    </div>
  );
}
