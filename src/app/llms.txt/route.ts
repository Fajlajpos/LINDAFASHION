import { NextResponse } from 'next/server';
import { nacistNastaveni } from '@/lib/nastaveni';
import { popisDopravyZdarma } from '@/lib/shipping';

/**
 * `/llms.txt` – strojově čitelný souhrn obchodu pro jazykové modely.
 *
 * Kontakty a doprava se čtou z `Settings`, ne z konstant. Do téhle chvíle tu
 * byly natvrdo vymyšlené údaje („Pařížská 12, Praha 1", `info@lindafashion.cz`,
 * telefon), takže web veřejně vydával cizí sídlo za sídlo prodávajícího – a
 * sliboval dopravu zdarma nad 2 500 Kč bez ohledu na `prahDopravaZdarma`.
 * Stejná úvaha jako u `/kontakt` a `shipping.ts`: co je zákaznici slíbeno,
 * pochází z administrace.
 *
 * Nevyplněný údaj se prostě neuvede. Vymyslet si ho by bylo horší.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const nastaveni = await nacistNastaveni();

  const dopravaZdarma = popisDopravyZdarma(nastaveni);
  const nazev = nastaveni.nazevFirmy ?? 'LINDA FASHION';

  /* Řádky bez hodnoty vypadnou, aby v souboru nezůstalo „E-mail: null". */
  const kontakty = [
    ['Web', 'https://lindafashion.cz'],
    ['Prodávající', nastaveni.nazevFirmy],
    ['IČO', nastaveni.icoFirmy],
    ['DIČ', nastaveni.dicFirmy],
    ['Sídlo', nastaveni.adresaFirmy],
    ['Prodejna', nastaveni.adresaProvozovny],
    ['Adresa pro vrácení zboží', nastaveni.adresaProVraceni],
    ['E-mail', nastaveni.emailFirmy],
    ['Telefon', nastaveni.telefonFirmy],
  ]
    .filter((radek): radek is [string, string] => Boolean(radek[1]))
    .map(([popisek, hodnota]) => `- ${popisek}: ${hodnota}`)
    .join('\n');

  const sluzby = [
    `Obvyklá doba dodání ${nastaveni.dodaciLhutaDnu} pracovních dnů.`,
    dopravaZdarma,
    'Odstoupení od smlouvy do 14 dnů od převzetí zboží (§ 1829 občanského zákoníku).',
  ]
    .filter(Boolean)
    .join(' ');

  const content = `# ${nazev} - Luxusní italská dámská móda

> ${nazev} je specializovaný český butik s prémiovým dámským oblečením dováženým přímo z rodinných dílen v Itálii.

## Hlavní charakteristika a filozofie
- **Výhradně italský původ**: Oblečení dováženo z tradičních dílen v Toskánsku, Miláně a Římě.
- **Přírodní prémiové materiály**: 100% přírodní hedvábí, toskánský len, kašmír a merino vlna.
- **Nadčasová elegance**: Nepodléháme rychlé módě (fast fashion). Každý model má přesně evidované míry.
- **Doprava a služby**: ${sluzby}

## Kategorie produktů
- Hedvábné a letní šaty
- Lněné a hedvábné halenky
- Kašmírové svetry a kardigany
- Vlněné flaušové kabáty a saka
- Fyzické dárkové poukazy

## Kontaktní informace
${kontakty}
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
