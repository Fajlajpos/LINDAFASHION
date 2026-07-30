import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/globals.css';

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

export const metadata: Metadata = {
  metadataBase: new URL('https://lindafashion.cz'),
  title: 'LINDA FASHION | Luxusní italská dámská móda',
  description: 'Butik s nadčasovou a kvalitní italskou dámskou módou. Hedvábné šaty, lněné halenky, kašmírové svetry a vlněné kabáty dovážené přímo z Itálie.',
  keywords: 'italská móda, dámské oblečení, hedvábné šaty, lněná halenky, kašmírový svetr, vlněný kabát, Linda Fashion',
  authors: [{ name: 'LINDA FASHION' }],
  openGraph: {
    title: 'LINDA FASHION | Luxusní italská dámská móda',
    description: 'Nadčasová elegance a kvalita z Itálie. Objevit novou kolekci.',
    url: 'https://lindafashion.cz',
    siteName: 'LINDA FASHION',
    locale: 'cs_CZ',
    type: 'website',
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
        <a href="#obsah" className="skip-link">
          Přeskočit na obsah
        </a>
        {children}
      </body>
    </html>
  );
}
