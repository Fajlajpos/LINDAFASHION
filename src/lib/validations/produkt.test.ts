import { describe, expect, it } from 'vitest';
import { nahranaFotkaSchema, produktSchema, urcitHlavni } from './produkt';

/*
 * Základní platný produkt.
 *
 * Nese i údaje o výrobci a složení – od zavedení GPSR a nařízení o textilu
 * jsou povinné, takže produkt bez nich už není „minimální platný vstup“,
 * ale neplatný. Kdyby v fixture chyběly, testovaly by ostatní případy jen to,
 * že schéma padá na výrobci, a ne to, co mají testovat.
 */
const zaklad = {
  nazev: 'Hedvábné šaty Bellissima',
  popis: 'Popis produktu.',
  categoryId: 'cat1',
  cena: 3490,
  slozeniMaterialu: '100 % hedvábí',
  vyrobceNazev: 'Tessitura Bellini S.r.l.',
  vyrobceAdresa: 'Via Roma 12, 50123 Firenze, Itálie',
  vyrobceEmail: 'info@bellini.it',
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

/*
 * GPSR (nařízení EU 2023/988) a nařízení EU 1007/2011 o textilu.
 *
 * Tyhle údaje nejsou kosmetika – zboží bez nich se nesmí nabízet. Kontrola
 * musí být ve schématu, ne jen ve formuláři: ručně sestavený požadavek by
 * jinak založil produkt, který je od první chvíle v rozporu s nařízením.
 */
describe('produktSchema – zákonné údaje o výrobku', () => {
  it.each([
    ['vyrobceNazev'],
    ['vyrobceAdresa'],
    ['vyrobceEmail'],
    ['slozeniMaterialu'],
  ])('odmítne zboží bez pole %s', (pole) => {
    const vysledek = produktSchema.safeParse({ ...zaklad, [pole]: null });

    expect(vysledek.success).toBe(false);
    if (!vysledek.success) {
      expect(vysledek.error.errors.some((e) => e.path[0] === pole)).toBe(true);
    }
  });

  it('odmítne prázdný řetězec stejně jako chybějící hodnotu', () => {
    // Formulář posílá nevyplněné pole jako '' – kdyby procházelo, byla by
    // povinnost splnitelná mezerníkem.
    expect(produktSchema.safeParse({ ...zaklad, vyrobceNazev: '   ' }).success).toBe(false);
  });

  it('odmítne nesmyslný e-mail výrobce', () => {
    expect(produktSchema.safeParse({ ...zaklad, vyrobceEmail: 'neni-email' }).success).toBe(false);
  });

  it('dárkový poukaz údaje o výrobci nepotřebuje', () => {
    // Poukaz není výrobek ve smyslu GPSR – nemá výrobce ani složení.
    const vysledek = produktSchema.safeParse({
      nazev: 'Dárkový poukaz',
      popis: 'Poukaz na nákup.',
      categoryId: 'cat1',
      cena: 1000,
      jeDarkovyPoukaz: true,
      varianty: [{ velikost: '1000 Kč', skladem: 99 }],
    });

    expect(vysledek.success).toBe(true);
  });

  it('přijme úplně vyplněnou odpovědnou osobu v EU', () => {
    const vysledek = produktSchema.safeParse({
      ...zaklad,
      odpovednaOsobaNazev: 'Dovozce s.r.o.',
      odpovednaOsobaAdresa: 'Pařížská 12, 110 00 Praha 1',
      odpovednaOsobaEmail: 'gpsr@dovozce.cz',
    });

    expect(vysledek.success).toBe(true);
  });

  it('odmítne odpovědnou osobu vyplněnou jen zčásti', () => {
    // „Jméno bez adresy“ povinnost podle čl. 16 GPSR nesplní – a na stránce
    // by vypadalo jako údaj, který tam je.
    const vysledek = produktSchema.safeParse({
      ...zaklad,
      odpovednaOsobaNazev: 'Dovozce s.r.o.',
    });

    expect(vysledek.success).toBe(false);
  });

  it('odpovědná osoba je nepovinná, když není vyplněná vůbec', () => {
    // Výrobce v EU žádnou odpovědnou osobu mít nemusí.
    expect(produktSchema.safeParse(zaklad).success).toBe(true);
  });
});
