import { describe, expect, it } from 'vitest';
import {
  hledaciNazevKategorie,
  hledaciTextProduktu,
  normalizovat,
  podminkaHledani,
  rozlozitDotaz,
} from './vyhledavani';

describe('normalizovat', () => {
  it('sundá diakritiku a převede na malá písmena', () => {
    expect(normalizovat('Hedvábné ŠATY')).toBe('hedvabne saty');
    expect(normalizovat('Kašmírový svetr Roma')).toBe('kasmirovy svetr roma');
    expect(normalizovat('Vlněný kabát Venezia')).toBe('vlneny kabat venezia');
  });

  it('sjednotí interpunkci a nadbytečné mezery na jednu mezeru', () => {
    expect(normalizovat('Halenky & Košile')).toBe('halenky kosile');
    expect(normalizovat('  šaty –  Bellissima!  ')).toBe('saty bellissima');
  });

  /* Tohle je celý důvod, proč sloupec vzniká: obě strany porovnání musí projít
     stejnou funkcí. Kdyby se rozešly, hledání přestane nacházet a nikdo
     nepozná proč. */
  it('dá stejný výsledek pro text s diakritikou i bez ní', () => {
    expect(normalizovat('Šaty')).toBe(normalizovat('saty'));
    expect(normalizovat('KAŠMÍR')).toBe(normalizovat('kasmir'));
  });

  /* Normalizace zároveň slouží jako pojistka: v tokenu nezbude nic, čím by
     se dal rozšířit `LIKE` vzor. */
  it('zahodí zástupné znaky LIKE', () => {
    expect(normalizovat('%_%')).toBe('');
    expect(normalizovat('sat%y')).toBe('sat y');
  });
});

describe('hledaciTextProduktu', () => {
  it('slije název, značku, popis, SKU a materiál do jednoho řetězce', () => {
    const text = hledaciTextProduktu({
      nazev: 'Kašmírový svetr Roma',
      znacka: 'Roma Knitwear',
      popis: 'Hebký svetr z prémiové směsi kašmíru.',
      sku: 'SVE-001',
      material: '80 % kašmír',
    });

    expect(text).toContain('kasmirovy svetr roma');
    expect(text).toContain('roma knitwear');
    expect(text).toContain('sve 001');
    expect(text).toContain('kasmir');
  });

  it('vynechaná pole přeskočí, ne aby z nich udělal prázdné mezery', () => {
    expect(hledaciTextProduktu({ nazev: 'Šaty', znacka: null, popis: null })).toBe('saty');
  });
});

describe('hledaciNazevKategorie', () => {
  it('normalizuje název kategorie', () => {
    expect(hledaciNazevKategorie({ nazev: 'Svetry & Kardigany' })).toBe('svetry kardigany');
  });
});

describe('rozlozitDotaz', () => {
  it('rozloží dotaz na slova bez diakritiky', () => {
    expect(rozlozitDotaz('Hedvábné šaty')).toEqual(['hedvabne', 'saty']);
  });

  it('zahodí duplicity a příliš krátká slova', () => {
    expect(rozlozitDotaz('saty a saty')).toEqual(['saty']);
  });

  it('prázdný dotaz nevrátí žádné slovo', () => {
    expect(rozlozitDotaz('   ')).toEqual([]);
    expect(rozlozitDotaz('%%%')).toEqual([]);
  });

  /* Jednopísmenný dotaz by po odfiltrování krátkých slov zůstal prázdný
     a hledání by se tiše vyplo – zákaznice by pod nadpisem „Výsledky pro M"
     viděla celý katalog. */
  it('jednopísmenný dotaz nechá jako jedno slovo, ne jako prázdno', () => {
    expect(rozlozitDotaz('M')).toEqual(['m']);
  });

  it('víc než šest slov usekne', () => {
    expect(rozlozitDotaz('jedna dva tri ctyri pet sest sedm osm')).toHaveLength(6);
  });
});

describe('podminkaHledani', () => {
  it('bez slov nevrací žádnou podmínku', () => {
    expect(podminkaHledani([])).toBeNull();
  });

  it('přísný režim vyžaduje všechna slova (AND)', () => {
    const podminka = podminkaHledani(['kasmirovy', 'svetr']);

    expect(podminka?.AND).toHaveLength(2);
    expect(podminka?.OR).toBeUndefined();
  });

  it('volný režim stačí na jedno slovo (OR)', () => {
    const podminka = podminkaHledani(['kasmirovy', 'svetr'], true);

    expect(podminka?.OR).toHaveLength(2);
    expect(podminka?.AND).toBeUndefined();
  });

  /* Slovo se musí hledat i v názvu kategorie – „saty" má najít celou
     kategorii Šaty, ne jen kousky, které to slovo mají v názvu. */
  it('každé slovo hledá v textu produktu i v názvu kategorie', () => {
    const podminka = podminkaHledani(['saty']);
    const proSlovo = (podminka?.AND as Array<Record<string, unknown>>)[0];

    expect(proSlovo).toEqual({
      OR: [
        { hledaciText: { contains: 'saty' } },
        { category: { hledaciNazev: { contains: 'saty' } } },
      ],
    });
  });
});
