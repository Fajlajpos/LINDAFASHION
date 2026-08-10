import { describe, expect, it } from 'vitest';
import { nahranaFotkaSchema, produktSchema, urcitHlavni } from './produkt';

const zaklad = {
  nazev: 'Hedvábné šaty Bellissima',
  popis: 'Popis produktu.',
  categoryId: 'cat1',
  cena: 3490,
  varianty: [{ velikost: 'M', skladem: 3 }],
};

describe('urcitHlavni', () => {
  it('vybere označenou fotku', () => {
    expect(urcitHlavni([{ jeHlavni: false }, { jeHlavni: true }, { jeHlavni: false }])).toBe(1);
  });

  it('bez označení vezme první', () => {
    // Produkt bez hlavní fotky by se v katalogu zobrazil se zástupným
    // symbolem, přestože fotky má.
    expect(urcitHlavni([{ jeHlavni: false }, { jeHlavni: false }])).toBe(0);
    expect(urcitHlavni([{}, {}])).toBe(0);
  });

  it('při několika označených vezme první z nich', () => {
    // Prohlížeč o počtu hlavních fotek rozhodovat nesmí – dvě označené by
    // znamenaly, že se v katalogu zobrazí náhodná.
    expect(urcitHlavni([{ jeHlavni: false }, { jeHlavni: true }, { jeHlavni: true }])).toBe(1);
  });
});

describe('nahranaFotkaSchema', () => {
  it('bez příznaku hlavní fotky doplní false', () => {
    const v = nahranaFotkaSchema.parse({ token: 'abc.jpg', puvodniNazev: 'saty.jpg' });
    expect(v.jeHlavni).toBe(false);
  });

  it('příznak přijme', () => {
    const v = nahranaFotkaSchema.parse({
      token: 'abc.jpg',
      puvodniNazev: 'saty.jpg',
      jeHlavni: true,
    });
    expect(v.jeHlavni).toBe(true);
  });
});

describe('produktSchema', () => {
  it('přijme produkt bez fotek a doplní prázdné pole', () => {
    expect(produktSchema.parse(zaklad).fotky).toEqual([]);
  });

  it('odmítne akční cenu vyšší než běžnou', () => {
    const vysledek = produktSchema.safeParse({ ...zaklad, cenaPoSleve: 4000 });

    expect(vysledek.success).toBe(false);
    if (!vysledek.success) expect(vysledek.error.errors[0].path).toEqual(['cenaPoSleve']);
  });

  it('odmítne dvě varianty se stejnou velikostí i barvou', () => {
    // Nejednoznačný sklad – nešlo by určit, ze které varianty odečíst.
    const vysledek = produktSchema.safeParse({
      ...zaklad,
      varianty: [
        { velikost: 'M', skladem: 3 },
        { velikost: ' m ', skladem: 5 },
      ],
    });

    expect(vysledek.success).toBe(false);
    if (!vysledek.success) expect(vysledek.error.errors[0].path).toEqual(['varianty']);
  });

  it('rozliší varianty stejné velikosti, ale jiné barvy', () => {
    const vysledek = produktSchema.safeParse({
      ...zaklad,
      varianty: [
        { velikost: 'M', barva: 'černá', skladem: 3 },
        { velikost: 'M', barva: 'béžová', skladem: 5 },
      ],
    });

    expect(vysledek.success).toBe(true);
  });

  it('vyžaduje alespoň jednu variantu', () => {
    expect(produktSchema.safeParse({ ...zaklad, varianty: [] }).success).toBe(false);
  });
});
