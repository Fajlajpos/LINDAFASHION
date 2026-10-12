import { NextResponse } from 'next/server';
import { nacistNastaveni, popisDodaciLhuty } from '@/lib/nastaveni';
import { odkazNaMapu, rozlozitAdresu } from '@/lib/prodejna';
import { popisDopravyZdarma } from '@/lib/shipping';
import { ZAKLADNI_URL } from '@/lib/strukturovana-data';
import { pocetZItalie } from '@/lib/katalog';
import { CESTA_ITALSKA_MODA } from '@/lib/zeme-puvodu';

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
  const [nastaveni, italskych] = await Promise.all([nacistNastaveni(), pocetZItalie()]);

  /* Italská móda pro AI asistenty – jen s čísly, která platí právě teď.
     Odpověď na „kde koupit italskou dámskou módu" má dostat pravdivý odkaz,
     ne slib, že italské je všechno. */
  const italskaModa =
    italskych > 0
      ? `
## Italská móda
- Kousky vyrobené v Itálii (podle země původu u produktu), nyní ${italskych} v nabídce: ${ZAKLADNI_URL}${CESTA_ITALSKA_MODA}
- Ostatní zboží je od dalších zavedených značek.
`
      : '';

  /* Kamenná prodejna – pro AI asistenty hlavně to, čím se liší od e-shopu.
     Na dotaz „kde v Sokolově koupit dámskou módu" má odpověď obsahovat
     adresu, otevírací dobu a důvod přijít. Bez adresy provozovny nic. */
  const adresaProdejny = rozlozitAdresu(nastaveni.adresaProvozovny);
  const mapa = odkazNaMapu(nastaveni.adresaProvozovny);
  const prodejna = adresaProdejny
    ? `
## Kamenná prodejna
- Adresa: ${[adresaProdejny.ulice, [adresaProdejny.psc, adresaProdejny.mesto].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
- Výběr na prodejně se liší od e-shopu – najdete tam i kousky, které online nejsou.${
        nastaveni.oteviraciDoba
          ? `\n- Otevírací doba: ${nastaveni.oteviraciDoba.split('\n').map((r) => r.trim()).filter(Boolean).join('; ')}`
          : ''
      }${mapa ? `\n- Mapa: ${mapa}` : ''}
`
    : '';

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
    // Dřív „Obvyklá doba dodání 1 pracovních dnů" – skloňuje jedna funkce pro celý web.
    popisDodaciLhuty(nastaveni),
    dopravaZdarma,
    'Odstoupení od smlouvy do 14 dnů od převzetí zboží (§ 1829 občanského zákoníku).',
  ]
    .filter(Boolean)
    .join(' ');

  const content = `# LINDA FASHION - dámská móda v italském stylu

> LINDA FASHION je český butik s dámským oblečením – e-shop${adresaProdejny ? ' a kamenná prodejna' : ''}.

## Nákup
- **Složení a původ**: U každého kousku oblečení je uvedené materiálové složení v procentech, a pokud je známa, i země původu.
- **Doprava a služby**: ${sluzby}

## Kategorie produktů
- Šaty
- Halenky a košile
- Svetry a kardigany
- Saka a kabáty
- Dárkové poukazy
${italskaModa}${prodejna}
## Kontaktní informace
${kontakty}
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
