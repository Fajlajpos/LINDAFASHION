import { describe, expect, it } from 'vitest';
import { obsahujeCitlivyParametr, ocistitAdresu } from './ocistit-adresu';

describe('ocistitAdresu', () => {
  it('skryje klíč objednávky i odkazu z e-mailu', () => {
    expect(ocistitAdresu('https://lindashop.cz/pokladna/potvrzeni?t=abc-123')).toBe(
      'https://lindashop.cz/pokladna/potvrzeni?t=skryto'
    );
    expect(ocistitAdresu('https://lindashop.cz/odstoupeni?token=xyz&krok=2')).toBe(
      'https://lindashop.cz/odstoupeni?token=skryto&krok=2'
    );
  });

  it('adresu bez klíče nechá beze změny', () => {
    const href = 'https://lindashop.cz/produkty/saty?hledat=len&stranka=2';
    expect(ocistitAdresu(href)).toBe(href);
  });

  it('nečitelnou adresu raději zahodí', () => {
    expect(ocistitAdresu('neni url')).toBe('');
    expect(ocistitAdresu('')).toBe('');
  });
});

describe('obsahujeCitlivyParametr', () => {
  it('pozná stránky s klíčem', () => {
    expect(obsahujeCitlivyParametr('https://lindashop.cz/pokladna/potvrzeni?t=abc')).toBe(true);
    expect(obsahujeCitlivyParametr('https://lindashop.cz/reklamace?token=abc')).toBe(true);
    expect(obsahujeCitlivyParametr('https://lindashop.cz/kosik')).toBe(false);
  });
});
