import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { vycistitDatabazi } from '@/test/data';
import { nacistNaseptavac, nacistProdukty } from '@/lib/katalog';
import { hledaciNazevKategorie, hledaciTextProduktu } from '@/lib/vyhledavani';

/**
 * Hledání podle klíčových slov nad skutečnou databází.
 *
 * Zesměšněná Prisma by tady neověřila nic: celý smysl je v tom, že se porovnává
 * **normalizovaný sloupec** proti normalizovanému dotazu. Dotaz „saty" musí
 * najít „Hedvábné šaty" a to je vlastnost dat v Postgresu, ne našeho kódu.
 */

async function pripravitKatalog() {
  const saty = await db.category.create({
    data: { nazev: 'Šaty', slug: 'saty', hledaciNazev: hledaciNazevKategorie({ nazev: 'Šaty' }) },
  });

  const svetry = await db.category.create({
    data: {
      nazev: 'Svetry & Kardigany',
      slug: 'svetry-a-kardigany',
      hledaciNazev: hledaciNazevKategorie({ nazev: 'Svetry & Kardigany' }),
    },
  });

  const zaloz = async (data: {
    nazev: string;
    slug: string;
    popis: string;
    znacka?: string;
    material?: string;
    categoryId: string;
  }) =>
    db.product.create({
      data: {
        ...data,
        cena: 2000,
        hledaciText: hledaciTextProduktu(data),
        variants: { create: [{ velikost: 'M', skladem: 2 }] },
      },
    });

  await zaloz({
    nazev: 'Hedvábné šaty Bellissima',
    slug: 'hedvabne-saty-bellissima',
    popis: 'Zavinovací šaty z čistého hedvábí.',
    znacka: 'Milano Elegance',
    categoryId: saty.id,
  });

  await zaloz({
    nazev: 'Kašmírový svetr Roma',
    slug: 'kasmirovy-svetr-roma',
    popis: 'Hebký pletený svetr.',
    material: '90 % kašmír',
    categoryId: svetry.id,
  });

  await zaloz({
    nazev: 'Bellissima kardigan',
    slug: 'bellissima-kardigan',
    popis: 'Dlouhý kardigan z merino vlny.',
    categoryId: svetry.id,
  });

  return { saty, svetry };
}

const nazvy = (produkty: Array<{ nazev: string }>) => produkty.map((p) => p.nazev).sort();

describe('hledání v katalogu', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await pripravitKatalog();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('najde produkt i bez diakritiky', async () => {
    const vysledek = await nacistProdukty({ hledat: 'saty' });

    expect(nazvy(vysledek.produkty)).toContain('Hedvábné šaty Bellissima');
    expect(vysledek.volnaShoda).toBe(false);
  });

  it('nezáleží na pořadí slov', async () => {
    const prirozene = await nacistProdukty({ hledat: 'kasmirovy svetr' });
    const prehozene = await nacistProdukty({ hledat: 'svetr kasmirovy' });

    expect(nazvy(prirozene.produkty)).toEqual(['Kašmírový svetr Roma']);
    expect(nazvy(prehozene.produkty)).toEqual(['Kašmírový svetr Roma']);
  });

  it('hledá i v popisu a materiálu', async () => {
    const vysledek = await nacistProdukty({ hledat: 'merino' });

    expect(nazvy(vysledek.produkty)).toEqual(['Bellissima kardigan']);
  });

  it('najde kousky podle názvu kategorie, i když ho v názvu nemají', async () => {
    const vysledek = await nacistProdukty({ hledat: 'kardigany' });

    // Oba svetry sedí na kategorii „Svetry & Kardigany".
    expect(nazvy(vysledek.produkty)).toEqual(['Bellissima kardigan', 'Kašmírový svetr Roma']);
  });

  /* Přísný režim: všechna slova musí sedět. „Bellissima" má šaty i kardigan,
     ale jen jeden z nich je kardigan. */
  it('víc slov výsledek zužuje, ne rozšiřuje', async () => {
    const jedno = await nacistProdukty({ hledat: 'bellissima' });
    const dve = await nacistProdukty({ hledat: 'bellissima kardigan' });

    expect(jedno.celkem).toBe(2);
    expect(nazvy(dve.produkty)).toEqual(['Bellissima kardigan']);
  });

  it('když na všechna slova nesedí nic, uvolní podmínku a přizná to', async () => {
    const vysledek = await nacistProdukty({ hledat: 'hedvabne kardigan' });

    expect(vysledek.volnaShoda).toBe(true);
    // „hedvabne" má jen jeden kus, „kardigan" oba svetry – jeden názvem,
    // druhý přes kategorii „Svetry & Kardigany". Ve volném režimu tedy
    // projdou všechny tři, protože stačí jediné slovo.
    expect(nazvy(vysledek.produkty)).toEqual([
      'Bellissima kardigan',
      'Hedvábné šaty Bellissima',
      'Kašmírový svetr Roma',
    ]);
  });

  it('na úplný nesmysl nevrátí nic a netváří se, že našel', async () => {
    const vysledek = await nacistProdukty({ hledat: 'zluty slon' });

    expect(vysledek.celkem).toBe(0);
    expect(vysledek.volnaShoda).toBe(false);
  });

  /* Tohle je ta chyba, kvůli které hledání a filtr kategorie skládá `AND`,
     ne rozprostření klíčů: obě podmínky sahají na `category`, takže by druhá
     tu první přepsala a filtr kategorie by se ztratil. */
  it('hledání uvnitř kategorie nesmí filtr kategorie zahodit', async () => {
    const vysledek = await nacistProdukty({ kategorie: 'svetry-a-kardigany', hledat: 'hedvabne' });

    expect(vysledek.celkem).toBe(0);
  });

  it('neaktivní produkt se nenajde', async () => {
    await db.product.updateMany({ where: { slug: 'kasmirovy-svetr-roma' }, data: { aktivni: false } });

    const vysledek = await nacistProdukty({ hledat: 'kasmirovy' });
    expect(vysledek.celkem).toBe(0);
  });
});

describe('nacistNaseptavac', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await pripravitKatalog();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('krátký dotaz do databáze vůbec nejde', async () => {
    const vysledek = await nacistNaseptavac('  ');

    expect(vysledek.produkty).toEqual([]);
    expect(vysledek.celkem).toBe(0);
  });

  /* Shoda v názvu váží víc než shoda v popisu. Bez toho rozhodovalo
     „doporučeno" a stáří, takže dotaz „kašmír" nabídl jako první kousek,
     který to slovo měl jen kdesi v popisu. */
  it('řadí shodu v názvu před shodu v popisu', async () => {
    await db.product.updateMany({
      where: { slug: 'bellissima-kardigan' },
      data: {
        doporuceny: true,
        hledaciText: hledaciTextProduktu({
          nazev: 'Bellissima kardigan',
          popis: 'Dlouhý kardigan z merino vlny, hebký skoro jako kasmirovy svetr.',
        }),
      },
    });

    const vysledek = await nacistNaseptavac('kasmirovy');

    expect(vysledek.produkty[0]?.nazev).toBe('Kašmírový svetr Roma');
  });

  it('nabídne i kategorii, na kterou dotaz sedí', async () => {
    const vysledek = await nacistNaseptavac('kardigany');

    expect(vysledek.kategorie.map((k) => k.slug)).toContain('svetry-a-kardigany');
  });
});
