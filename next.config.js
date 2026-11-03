/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Dockerfile kopíruje `.next/standalone` – bez tohohle přepínače se ta složka
  // vůbec nevygeneruje a produkční build v kontejneru spadne.
  output: 'standalone',

  experimental: {
    /* Jak dlouho si router v prohlížeči nechá už načtenou stránku, než si ji
       vyžádá znovu. Celý obchod je `force-dynamic`, takže bez tohohle by
       každé „zpátky do katalogu“ bylo nové kolo na server.
       30 s je krátce dost na to, aby se skladovost nedržela zastarale, a
       dlouho dost, aby proklik detail → zpět → jiný detail běžel z paměti.
       Hodnoty odpovídají výchozím v Next 14; píšeme je explicitně, protože
       v Next 15 se výchozí `dynamic` změnilo na 0 (tedy žádná paměť). */
    staleTimes: { dynamic: 30, static: 180 },
  },

  /* Fotky nahrané za běhu. Produkční server zná jen soubory, které byly
     v `public/` při startu, takže novější varianty vracely 404. `afterFiles`
     se uplatní až tehdy, když statický soubor nenajde – starší fotky dál
     obsluhuje Next přímo, nové vyřídí src/app/api/uploads/[soubor]/route.ts. */
  async rewrites() {
    return {
      afterFiles: [{ source: '/uploads/:soubor', destination: '/api/uploads/:soubor' }],
    };
  },

  images: {
    // Fotky produktů se servírují lokálně z /public/uploads (same-origin),
    // takže žádný cizí původ optimalizátor obrázků nepotřebuje.
    // Dřív tu byl hostname: '**', což je otevřená proxy na libovolný web,
    // a pak `api.qrserver.com` – QR platba se ale už generuje na serveru
    // (qr-code.ts), takže výjimka jen zbytečně rozšiřovala, odkud si
    // optimalizátor smí obrázky stahovat.
    remotePatterns: [],
  },

  /*
   * Bezpečnostní hlavičky. Dřív žily jen v `Caddyfile` – jenže produkce běží
   * na Coolify s vlastní proxy a Caddyfile se tam nepoužívá, takže web je
   * neposílal vůbec: administrace šla vložit do cizího iframu (clickjacking)
   * a prohlížeč nevynucoval HTTPS.
   *
   * Plná Content-Security-Policy schválně **není**: inline skripty Nextu,
   * GA4, Pixel, Turnstile a mapa Zásilkovny by se s ní rozbily a odladit ji
   * bez prohlížeče u každé z nich nejde. CSP tu nese jen direktivy, které nic
   * z toho nepoužívá. `Permissions-Policy` na geolokaci chybí taky – widget
   * Zásilkovny v iframu ji smí chtít kvůli „výdejní místa poblíž“.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Bez `includeSubDomains`: to by zavázalo i subdomény, o kterých web
          // nic neví (panel serveru, pošta) – kdyby některá jela jen po HTTP,
          // prohlížeč by ji přestal otevírat.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
