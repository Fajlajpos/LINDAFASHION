import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/globals.css';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

// Samohostované fonty: bez render-blocking requestu na Google a bez CLS
// (`display: swap` + automatický fallback s upravenými metrikami).
const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

/*
 * Adresa webu z `APP_URL`, ne natvrdo. Doména ještě není koupená, a kdyby
 * nakonec nebyla `lindafashion.cz`, posílaly by canonical a Open Graph
 * vyhledávače na cizí web. Statické stránky se skládají při `next build`,
 * proto `APP_URL` chodí do Docker buildu jako build arg (viz Dockerfile).
 *
 * Popis tvrdil „dovážené přímo z Itálie" – o původu jednotlivých kusů ale
 * mluví jen `Product.zemePuvodu`, takže tvrzení o celém sortimentu sem nepatří.
 */
export const metadata: Metadata = {
  metadataBase: new URL(ZAKLADNI_URL),
  title: 'LINDA FASHION | Luxusní italská dámská móda',
  description: 'Butik s nadčasovou dámskou módou v italském stylu. Šaty, halenky, svetry, saka a kabáty.',
  keywords: 'italská móda, dámské oblečení, hedvábné šaty, lněná halenky, kašmírový svetr, vlněný kabát, Linda Fashion',
  authors: [{ name: 'LINDA FASHION' }],
  openGraph: {
    title: 'LINDA FASHION | Luxusní italská dámská móda',
    description: 'Nadčasová elegance v italském stylu. Objevte kolekci.',
    url: ZAKLADNI_URL,
    siteName: 'LINDA FASHION',
    locale: 'cs_CZ',
    type: 'website',
    // Statické PNG v /public, ne generované přes @vercel/og – to při buildu
    // padalo na načtení fontu a shodilo celý export.
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LINDA FASHION – italská dámská móda',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LINDA FASHION | Luxusní italská dámská móda',
    description: 'Nadčasová elegance v italském stylu.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale/userScalable se záměrně nenastavuje – zoom musí zůstat povolený
  themeColor: '#FAF8F4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`scroll-smooth ${cormorant.variable} ${jakarta.variable}`}>
      <body>
        {/* Sekce, které naskakují při skrolu (`Reveal`), startují průhledné a
            viditelnými je dělá až JavaScript. Bez něj by obsah zůstal skrytý
            napořád – tohle pravidlo je proto vrátí zpět. */}
        <noscript>
          {/* eslint-disable-next-line react/no-danger */}
          <style
            dangerouslySetInnerHTML={{
              __html: '.js-reveal{opacity:1 !important;transform:none !important}',
            }}
          />
        </noscript>
        <a href="#obsah" className="skip-link">
          Přeskočit na obsah
        </a>
        {children}
      </body>
    </html>
  );
}
