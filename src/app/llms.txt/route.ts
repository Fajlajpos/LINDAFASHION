import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# LINDA FASHION - Luxusní italská dámská móda

> LINDA FASHION je specializovaný český butik s prémiovým dámským oblečením dováženým přímo z rodinných dílen v Itálii.

## Hlavní charakteristika a filozofie
- **Výhradně italský původ**: Oblečení dováženo z tradičních dílen v Toskánsku, Miláně a Římě.
- **Přírodní prémiové materiály**: 100% přírodní hedvábí, toskánský len, kašmír a merino vlna.
- **Nadčasová elegance**: Nepodléháme rychlé módě (fast fashion). Každý model má přesně evidované míry.
- **Doprava a služby**: Doprava zdarma při nákupu nad 2 500 Kč, 14 dnů na vrácení zdarma.

## Kategorie produktů
- Hedvábné a letní šaty
- Lněné a hedvábné halenky
- Kašmírové svetry a kardigany
- Vlněné flaušové kabáty a saka
- Fyzické dárkové poukazy

## Kontaktní informace
- Web: https://lindafashion.cz
- Sídlo a Butik: Pařížská 12, 110 00 Praha 1
- E-mail: info@lindafashion.cz
- Telefon: +420 777 888 999
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
