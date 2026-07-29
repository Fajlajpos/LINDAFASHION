import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/muj-ucet'],
    },
    sitemap: 'https://lindafashion.cz/sitemap.xml',
  };
}
