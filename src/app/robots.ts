import { MetadataRoute } from 'next';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Neveřejné a nákupní části webu nemají v indexu co dělat.
      disallow: ['/admin', '/api/', '/muj-ucet', '/oblibene', '/kosik', '/pokladna', '/obnova-hesla'],
    },
    sitemap: `${ZAKLADNI_URL}/sitemap.xml`,
    host: ZAKLADNI_URL,
  };
}
