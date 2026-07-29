import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
