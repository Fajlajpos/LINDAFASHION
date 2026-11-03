'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  UDALOST_ZMENA_SOUHLASU,
  nacistSouhlas,
  type SouhlasCookies,
} from '@/lib/souhlas-cookies';
import { obsahujeCitlivyParametr, ocistitAdresu } from '@/lib/ocistit-adresu';

type OknoSMerenim = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

/**
 * Načte měřicí skripty – ale výhradně po udělení souhlasu (sekce 11 a 18).
 *
 * Skripty se nevkládají a "nevypínají", ale vůbec se nenačtou, dokud
 * návštěvnice nesouhlasí. To je jediný způsob, který GDPR uznává: samotné
 * načtení GA4 nebo Pixelu už zapíše cookie.
 *
 * ID se berou z .env. Dokud tam nejsou, komponenta nevykreslí nic, takže
 * e-shop funguje bez nich úplně stejně.
 *
 * Bez `anonymize_ip`: v GA4 ten parametr nedělá nic (IP adresy z EU Google
 * neukládá nikdy) a v kódu jen vzbuzoval dojem, že měření je anonymní. Není –
 * `_ga` nese identifikátor, data jsou pseudonymní, a tak je to i popsané.
 *
 * Skripty se po odvolání souhlasu samy neodnačtou; o to se stará
 * `CookieBanner` znovunačtením stránky.
 *
 * ## Jednorázové klíče v adrese
 *
 * Oba nástroje posílají s událostmi celou URL. Stránky jako
 * `/pokladna/potvrzeni?t=…` nesou klíč, který bez přihlášení otevírá cizí
 * jméno, adresu a fakturu – ten se ke Googlu ani Metě dostat nesmí.
 *
 * - **Meta Pixel** nic automaticky nesleduje (`autoConfig` vypnutý,
 *   `disablePushState`), `PageView` posíláme sami a na stránce s klíčem
 *   vůbec ne. Tohle je spolehlivé.
 * - **GA4** dostává `page_location` a `page_referrer` očištěné přes
 *   `ocistitAdresu` – při načtení i po každé změně cesty (`gtag('set')`).
 *   Automatické události rozšířeného měření si ale GA4 může skládat
 *   z `location` samo, takže pojistkou je v administraci GA4 zapnuté
 *   „Redact data“ pro parametry `t` a `token` (dokumenty/nasazeni.md).
 */
export function AnalytickeSkripty() {
  const [souhlas, setSouhlas] = useState<SouhlasCookies | null>(null);
  const pathname = usePathname();
  const prvniCesta = useRef(true);

  useEffect(() => {
    setSouhlas(nacistSouhlas());

    const reaguj = (e: Event) => setSouhlas((e as CustomEvent<SouhlasCookies>).detail);
    window.addEventListener(UDALOST_ZMENA_SOUHLASU, reaguj);
    return () => window.removeEventListener(UDALOST_ZMENA_SOUHLASU, reaguj);
  }, []);

  /*
   * Změna stránky bez znovunačtení. První průchod přeskakujeme: úvodní
   * zobrazení odešlou inline skripty níž, jakmile se načtou.
   */
  useEffect(() => {
    if (prvniCesta.current) {
      prvniCesta.current = false;
      return;
    }

    const okno = window as OknoSMerenim;
    const href = window.location.href;

    if (typeof okno.gtag === 'function') {
      okno.gtag('set', { page_location: ocistitAdresu(href) });
    }

    if (typeof okno.fbq === 'function' && !obsahujeCitlivyParametr(href)) {
      okno.fbq('track', 'PageView');
    }
  }, [pathname]);

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Skripty se vykreslí až po přečtení souhlasu v efektu, tedy jen v prohlížeči.
  const href = typeof window === 'undefined' ? '' : window.location.href;
  const referrer = typeof document === 'undefined' ? '' : document.referrer;

  return (
    <>
      {souhlas?.analyticke && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(gaId)}, {
                page_location: ${JSON.stringify(ocistitAdresu(href))},
                page_referrer: ${JSON.stringify(ocistitAdresu(referrer))}
              });
            `}
          </Script>
        </>
      )}

      {souhlas?.marketingove && pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq.disablePushState = true;
            fbq('set', 'autoConfig', false, ${JSON.stringify(pixelId)});
            fbq('init', ${JSON.stringify(pixelId)});
            ${obsahujeCitlivyParametr(href) ? '' : "fbq('track', 'PageView');"}
          `}
        </Script>
      )}
    </>
  );
}
