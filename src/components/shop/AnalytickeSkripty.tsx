'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import {
  UDALOST_ZMENA_SOUHLASU,
  nacistSouhlas,
  type SouhlasCookies,
} from '@/lib/souhlas-cookies';

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
 */
export function AnalytickeSkripty() {
  const [souhlas, setSouhlas] = useState<SouhlasCookies | null>(null);

  useEffect(() => {
    setSouhlas(nacistSouhlas());

    const reaguj = (e: Event) => setSouhlas((e as CustomEvent<SouhlasCookies>).detail);
    window.addEventListener(UDALOST_ZMENA_SOUHLASU, reaguj);
    return () => window.removeEventListener(UDALOST_ZMENA_SOUHLASU, reaguj);
  }, []);

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {souhlas?.analyticke && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
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
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
