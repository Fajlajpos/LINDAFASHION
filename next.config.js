/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Dockerfile kopíruje `.next/standalone` – bez tohohle přepínače se ta složka
  // vůbec nevygeneruje a produkční build v kontejneru spadne.
  output: 'standalone',

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
