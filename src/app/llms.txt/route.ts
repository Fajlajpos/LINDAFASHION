import { NextResponse } from 'next/server';
import { nacistNastaveni } from '@/lib/nastaveni';
import { popisDopravyZdarma } from '@/lib/shipping';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';

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
 *
 * Totéž platí pro popis obchodu. Stálo tu „výhradně italský původ, dováženo
 * z tradičních dílen v Toskánsku, Miláně a Římě" a „100% přírodní hedvábí" –
 * text převzatý z vymyšlené stránky „O mně", který nikdo neověřil a o
 * jednotlivých kusech nemusí platit. Zůstalo jen to, co plyne z dat.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const nastaveni = await nacistNastaveni();

  const dopravaZdarma = popisDopravyZdarma(nastaveni);

  /* Řádky bez hodnoty vypadnou, aby v souboru nezůstalo „E-mail: null". */
  const kontakty = [
    ['Web', ZAKLADNI_URL],
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

  const content = `# LINDA FASHION - dámská móda v italském stylu

> LINDA FASHION je český butik s dámským oblečením.

## Nákup
- **Složení a původ**: U každého kousku oblečení je uvedené materiálové složení v procentech, a pokud je známa, i země původu.
- **Doprava a služby**: ${sluzby}

## Kategorie produktů
- Šaty
- Halenky a košile
- Svetry a kardigany
- Saka a kabáty
- Dárkové poukazy

## Kontaktní informace
${kontakty}
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
