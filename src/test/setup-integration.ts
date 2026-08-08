/**
 * Přesměruje `DATABASE_URL` na testovací databázi.
 *
 * Musí proběhnout **dřív, než se načte `lib/db.ts`** – ten si adresu přečte
 * při vytvoření Prisma klienta a později se už nemění. Vitest `setupFiles`
 * spouští před importy testovaného modulu, takže tohle je to správné místo;
 * nastavení uvnitř testu by přišlo pozdě.
 */
import { vi } from 'vitest';
import { adresaTestovaciDatabaze, nacistEnvSoubor, overitBezpecnostAdresy } from './testovaci-databaze';

/*
 * `cache()` z Reactu, které používá `nastaveni.ts`, existuje jen v serverovém
 * buildu Reactu. Ten se vybírá exportní podmínkou `react-server`; Next si ji
 * nastavuje sám, Vitest ne – a stabilní React 18.3 ten build navíc odmítá
 * spustit mimo experimentální kanál.
 *
 * Náhrada je záměrně **bez memoizace**, ne jen kvůli jednoduchosti: `cache()`
 * drží výsledek po dobu jednoho požadavku, kdežto testy mění nastavení
 * e-shopu mezi případy. S memoizací by si druhý test přečetl hodnoty prvního
 * a padal by bez zjevné příčiny.
 */
vi.mock('react', async (nactiPuvodni) => {
  const skutecny = await nactiPuvodni<typeof import('react')>();
  return { ...skutecny, cache: <T,>(fn: T): T => fn };
});

nacistEnvSoubor();

const adresa = adresaTestovaciDatabaze();

if (adresa) {
  // Druhá kontrola vedle té v global-setup: sem se běh dostane i tehdy, když
  // někdo pustí vitest s vlastní konfigurací a global setup obejde.
  overitBezpecnostAdresy(adresa);
  process.env.DATABASE_URL = adresa;
}
