import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://lindafashion.cz';

  const routes = [
    '',
    '/produkty',
    '/produkty/saty',
    '/produkty/halenky-a-kosile',
    '/produkty/svetry-a-kardigany',
    '/produkty/saka-a-kabaty',
    '/produkty/darkove-poukazy',
    '/o-mne',
    '/kontakt',
    '/doprava-a-platba',
    '/obchodni-podminky',
    '/ochrana-osobnich-udaju',
    '/cookies',
    '/reklamacni-rad',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/produkty' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.startsWith('/produkty') ? 0.8 : 0.5,
  }));
}
