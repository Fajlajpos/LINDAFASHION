import { MetadataRoute } from 'next';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Neveřejné a nákupní části webu nemají v indexu co dělat.
      // Textury (omítka, papír) jsou dekorace přes půl heru – Google si jednu
      // vybral jako náhled domovské stránky ve výsledcích hledání, místo fotky.
      // Zákaz platí i pro jejich optimalizované kopie z `next/image`.
      disallow: [
        '/admin',
        '/api/',
        '/muj-ucet',
        '/oblibene',
        '/kosik',
        '/pokladna',
        '/obnova-hesla',
        '/textures/',
        '/_next/image?url=%2Ftextures',
      ],
    },
    sitemap: `${ZAKLADNI_URL}/sitemap.xml`,
    host: ZAKLADNI_URL,
  };
}
