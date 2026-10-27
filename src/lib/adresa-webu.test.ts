import { afterEach, describe, expect, it } from 'vitest';
import { adresaWebu } from './adresa-webu';

const puvodni = process.env.APP_URL;

afterEach(() => {
  if (puvodni === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = puvodni;
});

describe('adresaWebu', () => {
  it('bez APP_URL vrátí výchozí adresu', () => {
    delete process.env.APP_URL;
    expect(adresaWebu()).toBe('http://localhost:3000');
    expect(adresaWebu('https://lindafashion.cz')).toBe('https://lindafashion.cz');
  });

  it('doplní chybějící https:// – jinak padal build na Invalid URL', () => {
    process.env.APP_URL = 'abc.57.128.248.224.sslip.io';
    expect(adresaWebu()).toBe('https://abc.57.128.248.224.sslip.io');
  });

  it('odstraní koncové lomítko, mezery a uvozovky', () => {
    process.env.APP_URL = '  "https://lindashop.cz/" ';
    expect(adresaWebu()).toBe('https://lindashop.cz');
  });

  it('ponechá http i port', () => {
    process.env.APP_URL = 'http://localhost:3001';
    expect(adresaWebu()).toBe('http://localhost:3001');
  });

  it('nečitelnou hodnotu nahradí výchozí adresou', () => {
    process.env.APP_URL = 'https://lin da.cz';
    expect(adresaWebu('https://lindafashion.cz')).toBe('https://lindafashion.cz');
  });
});
