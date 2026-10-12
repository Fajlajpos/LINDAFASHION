import { describe, expect, it } from 'vitest';
import {
  kratkaAdresa,
  odkazNaMapu,
  oteviraciDobaProSchema,
  radkyOteviraciDoby,
  rozlozitAdresu,
} from './prodejna';

const ADRESA = 'Linda Fashion, Rokycanova 1929, 356 01 Sokolov';
const DOBA = 'Po–Čt: 10:00–12:00, 12:30–17:00\nPá: 10:00–12:00, 12:30–16:00\nSo–Ne: zavřeno';

describe('rozlozitAdresu', () => {
  it('zahodí název obchodu a rozdělí ulici, PSČ a město', () => {
    expect(rozlozitAdresu(ADRESA)).toEqual({ ulice: 'Rokycanova 1929', psc: '356 01', mesto: 'Sokolov' });
  });

  it('zvládne adresu bez názvu i PSČ bez mezery', () => {
    expect(rozlozitAdresu('Rokycanova 1929, 35601 Sokolov')).toEqual({
      ulice: 'Rokycanova 1929',
      psc: '356 01',
      mesto: 'Sokolov',
    });
  });

  it('prázdná adresa = nic', () => {
    expect(rozlozitAdresu(null)).toBeNull();
    expect(rozlozitAdresu('  ')).toBeNull();
  });
});

describe('kratkaAdresa a odkazNaMapu', () => {
  it('do patičky ulice a město, bez názvu a PSČ', () => {
    expect(kratkaAdresa(ADRESA)).toBe('Rokycanova 1929, Sokolov');
  });

  it('mapa hledá adresu bez názvu obchodu', () => {
    expect(odkazNaMapu(ADRESA)).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Rokycanova 1929, 356 01 Sokolov')
    );
  });
});

describe('radkyOteviraciDoby', () => {
  it('rozdělí dny a časy, zavřeno pozná', () => {
    expect(radkyOteviraciDoby(DOBA)).toEqual([
      { dny: 'Po–Čt', cas: '10:00–12:00, 12:30–17:00', zavreno: false },
      { dny: 'Pá', cas: '10:00–12:00, 12:30–16:00', zavreno: false },
      { dny: 'So–Ne', cas: 'zavřeno', zavreno: true },
    ]);
  });

  it('zvládne řádek bez dvojtečky a nerozdělitelný nechá celý', () => {
    expect(radkyOteviraciDoby('sobota 9–12\nV létě dle domluvy')).toEqual([
      { dny: 'sobota', cas: '9–12', zavreno: false },
      { dny: 'V létě dle domluvy', cas: '', zavreno: false },
    ]);
  });
});

describe('oteviraciDobaProSchema', () => {
  it('přečte skutečnou otevírací dobu prodejny, zavřené dny vynechá', () => {
    expect(oteviraciDobaProSchema(DOBA)).toEqual([
      'Mo-Th 10:00-12:00',
      'Mo-Th 12:30-17:00',
      'Fr 10:00-12:00',
      'Fr 12:30-16:00',
    ]);
  });

  it('bere celé názvy dnů, spojovník i hodiny bez minut', () => {
    expect(oteviraciDobaProSchema('pondělí 10-12, 12:30-17\nsobota zavřeno')).toEqual([
      'Mo 10:00-12:00',
      'Mo 12:30-17:00',
    ]);
  });

  // Zkomolená doba v mapách by poslala zákaznici k zavřenému obchodu.
  it('co nepřečte, to do dat pro Google nepustí', () => {
    expect(oteviraciDobaProSchema('Po–Pá: dle domluvy')).toBeNull();
    expect(oteviraciDobaProSchema('Každý den kromě svátků 10–17')).toBeNull();
    expect(oteviraciDobaProSchema(null)).toBeNull();
  });
});
