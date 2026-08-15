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

  images: {
    // Fotky produktů se servírují lokálně z /public/uploads (same-origin),
    // takže tady stačí jen externí služby, které opravdu používáme.
    // Dřív tu byl hostname: '**', což je otevřená proxy na libovolný web.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
};

module.exports = nextConfig;
