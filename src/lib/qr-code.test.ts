import { describe, expect, it } from 'vitest';
import { generateQrPaymentString, qrPlatbaSvg } from './qr-code';

describe('generateQrPaymentString', () => {
  it('skládá SPD 1.0 bez diakritiky a s VS jen z číslic', () => {
    expect(
      generateQrPaymentString({
        iban: 'CZ65 0800 0000 1920 0014 5399',
        amount: 1290,
        variableSymbol: '2026-00012',
        message: 'Objednávka 2026-00012',
      })
    ).toBe('SPD*1.0*ACC:CZ6508000000192000145399*AM:1290.00*CC:CZK*VS:202600012*MSG:Objednavka 2026-00012');
  });
});

describe('qrPlatbaSvg', () => {
  const spd = 'SPD*1.0*ACC:CZ6508000000192000145399*AM:1290.00*CC:CZK*VS:202600012';

  it('vrací SVG', async () => {
    const svg = await qrPlatbaSvg(spd);
    expect(svg.trimStart().startsWith('<svg')).toBe(true);
  });

  /* Celý smysl: kód se nevyrábí u cizí služby, takže v něm nesmí být žádný
     odkaz ven – jen jmenný prostor SVG, který prohlížeč nestahuje. */
  it('neodkazuje na žádný cizí server', async () => {
    const svg = await qrPlatbaSvg(spd);
    const adresy = svg.match(/https?:\/\/[^"' ]+/g) ?? [];
    expect(adresy.filter((a) => a !== 'http://www.w3.org/2000/svg')).toEqual([]);
  });

  it('je deterministický', async () => {
    expect(await qrPlatbaSvg(spd)).toBe(await qrPlatbaSvg(spd));
  });
});
