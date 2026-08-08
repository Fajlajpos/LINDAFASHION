import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jeStejnyPuvod, zodNaPole } from './api';

/**
 * `jeStejnyPuvod` volá **každý** mutující endpoint v aplikaci (38 souborů).
 * Když se splete, přestane fungovat všechno, co zapisuje, naráz – a typecheck
 * o tom neřekne nic. Proto na ni testy jsou.
 */
describe('jeStejnyPuvod', () => {
  const puvodniAppUrl = process.env.APP_URL;
  const puvodniNextAuthUrl = process.env.NEXTAUTH_URL;

  const dotaz = (hlavicky: Record<string, string>) =>
    new Request('https://lindafashion.cz/api/objednavky', { method: 'POST', headers: hlavicky });

  beforeEach(() => {
    process.env.APP_URL = 'https://lindafashion.cz';
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    if (puvodniAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = puvodniAppUrl;

    if (puvodniNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = puvodniNextAuthUrl;
  });

  it('pustí požadavek z vlastní stránky', () => {
    expect(
      jeStejnyPuvod(dotaz({ origin: 'https://lindafashion.cz', 'sec-fetch-site': 'same-origin' }))
    ).toBe(true);
  });

  it('odmítne požadavek vyvolaný cizím webem', () => {
    expect(
      jeStejnyPuvod(dotaz({ origin: 'https://zlodej.example', 'sec-fetch-site': 'cross-site' }))
    ).toBe(false);
  });

  it('odmítne cizí origin i bez Sec-Fetch-Site', () => {
    // Starší prohlížeč hlavičku neposílá; kontrola originu musí stačit sama.
    expect(jeStejnyPuvod(dotaz({ origin: 'https://zlodej.example' }))).toBe(false);
  });

  /*
   * Regrese: `Sec-Fetch-Site` chvíli rozhodovala i o povolení, takže projít
   * mohly jen hodnoty `same-origin` a `none`. Web ale běží na apexu i na
   * `www`, kde prohlížeč pošle `same-site` – tím by se jedna z těch variant
   * odstřihla a přestal by fungovat každý zápis na ní.
   */
  it('pustí www variantu téže domény (same-site)', () => {
    process.env.APP_URL = 'https://www.lindafashion.cz';

    expect(
      jeStejnyPuvod(dotaz({ origin: 'https://www.lindafashion.cz', 'sec-fetch-site': 'same-site' }))
    ).toBe(true);
  });

  it('pustí požadavek bez hlavičky Origin', () => {
    // Non-browser klient (curl, monitoring) origin neposílá. Cookie s ním
    // stejně nepřijde, takže tudy CSRF nevede.
    expect(jeStejnyPuvod(dotaz({}))).toBe(true);
  });

  it('pustí origin odpovídající hlavičce Host, i když APP_URL chybí', () => {
    // Vývoj na jiném portu nebo nasazení bez vyplněné APP_URL.
    delete process.env.APP_URL;

    expect(
      jeStejnyPuvod(
        new Request('http://localhost:3000/api/kosik', {
          method: 'POST',
          headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
        })
      )
    ).toBe(true);
  });

  it('nespadne na nesmyslné APP_URL', () => {
    // Rozbitá proměnná v .env nesmí shodit každý zápis výjimkou.
    process.env.APP_URL = 'tohle-neni-url';

    expect(() => jeStejnyPuvod(dotaz({ origin: 'https://lindafashion.cz' }))).not.toThrow();
  });

  it('cross-site přebije i shodný Origin', () => {
    // Kdyby si někdo origin podvrhl, prohlížečem doplněná hlavička vyhrává.
    expect(
      jeStejnyPuvod(dotaz({ origin: 'https://lindafashion.cz', 'sec-fetch-site': 'cross-site' }))
    ).toBe(false);
  });
});

describe('zodNaPole', () => {
  const schema = z.object({
    email: z.string().email('Tohle nevypadá jako platný e-mail.'),
    heslo: z.string().min(8, 'Heslo musí mít alespoň 8 znaků.'),
  });

  it('převede chyby na mapu pole → hláška', () => {
    const vysledek = schema.safeParse({ email: 'neplatny', heslo: 'krat' });
    expect(vysledek.success).toBe(false);
    if (vysledek.success) return;

    const pole = zodNaPole(vysledek.error);

    expect(pole.email).toBe('Tohle nevypadá jako platný e-mail.');
    expect(pole.heslo).toBe('Heslo musí mít alespoň 8 znaků.');
  });

  it('u vnořeného pole spojí cestu tečkou', () => {
    const vnorene = z.object({ adresa: z.object({ psc: z.string().min(5, 'PSČ má pět číslic.') }) });
    const vysledek = vnorene.safeParse({ adresa: { psc: '11' } });
    if (vysledek.success) return;

    expect(zodNaPole(vysledek.error)['adresa.psc']).toBe('PSČ má pět číslic.');
  });

  it('chybu bez cesty schová pod `_`, ať se neztratí', () => {
    const sRefine = z
      .object({ a: z.string(), b: z.string() })
      .refine((d) => d.a === d.b, { message: 'Hodnoty se neshodují.' });

    const vysledek = sRefine.safeParse({ a: 'x', b: 'y' });
    if (vysledek.success) return;

    expect(zodNaPole(vysledek.error)._).toBe('Hodnoty se neshodují.');
  });
});
