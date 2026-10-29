import { describe, expect, it } from 'vitest';
import { popisBodu } from './packeta-widget';

describe('popisBodu', () => {
  it('Z-BOX s ulicí v názvu nevypíše ulici dvakrát', () => {
    expect(
      popisBodu({ formatedValue: 'Z-BOX Cheb, Riegerova 2386/56, Riegerova 2386/56, Cheb' }),
    ).toBe('Z-BOX Cheb, Riegerova 2386/56, Cheb');

    expect(
      popisBodu({ name: 'Z-BOX Cheb, Riegerova 2386/56', street: 'Riegerova 2386/56', city: 'Cheb' }),
    ).toBe('Z-BOX Cheb, Riegerova 2386/56, Cheb');
  });

  it('běžnou pobočku poskládá z názvu, ulice a města', () => {
    expect(popisBodu({ name: 'Cheb, Svobody 12 (Trafika)', street: 'Svobody 12', city: 'Cheb' })).toBe(
      'Cheb, Svobody 12 (Trafika), Svobody 12',
    );
    expect(popisBodu({ name: 'Trafika U Nádraží', street: 'Nádražní 5', city: undefined })).toBe(
      'Trafika U Nádraží, Nádražní 5',
    );
  });
});
