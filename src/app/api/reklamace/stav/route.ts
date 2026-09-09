import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { najitObjednavkuKlicem, type VerejnyKlic } from '@/lib/odstoupeni';

export const dynamic = 'force-dynamic';

/**
 * Stav reklamace nebo vrácení **bez přihlášení**.
 *
 * `Reklamace.token` se od začátku generoval ke každé žádosti a schéma u něj
 * má napsané „přístup k detailu přes token, ne přes přihlášení" – jenže ho
 * nikdo nikdy nepřečetl. Zákaznice bez účtu (a ta smí reklamovat stejně jako
 * registrovaná) tak neměla jak zjistit, co se s její žádostí děje; jediná
 * zpráva přišla až na konci, e-mailem o vyřízení.
 *
 * ## Proč vlastní endpoint a ne rozšíření `/api/reklamace/objednavka`
 *
 * Tamten odpovídá na otázku „lze teď reklamovat?", a proto odmítá objednávku
 * před doručením i zrušenou. Na otázku „jak dopadla moje reklamace?" jsou
 * to ale nesprávné odpovědi: objednávka mohla mezitím přejít do `VRACENA`
 * právě tou reklamací, a zákaznice má pořád právo vidět, jak skončila.
 * Sdílená zůstává **autorizace**, tedy ta část, která se rozejít nesmí.
 *
 * ## Dvě cesty dovnitř
 *
 *  • `token` – klíč jedné konkrétní žádosti (`Reklamace.token`) z odkazu
 *    v e-mailu; ukáže právě ji;
 *  • `cisloObjednavky` + `email` – tatáž dvojice jako u reklamačního
 *    formuláře; ukáže všechny žádosti k té objednávce. Tahle cesta funguje
 *    i bez e-mailu, takže stránka není závislá na nastaveném SMTP.
 */

const klicSchema = z
  .object({
    token: z.string().min(10).max(200).optional(),
    cisloObjednavky: z.string().max(40).optional(),
    email: z.string().max(200).optional(),
  })
  .refine((d) => !!d.token || (!!d.cisloObjednavky && !!d.email), {
    message: 'Zadejte číslo objednávky i e-mail.',
  });

/**
 * Co se posílá ven.
 *
 * `poznamkaAdmina` je vyjádření k výsledku, které má zákaznice právo znát –
 * ne interní poznámka. Název kusu vede přes variantu k produktu, `OrderItem`
 * sám žádný nedrží.
 */
const VYBER = {
  typ: true,
  stav: true,
  duvod: true,
  poznamkaAdmina: true,
  datumPrijeti: true,
  datumVyrizeni: true,
  lhutaDo: true,
  orderItem: {
    select: { variant: { select: { velikost: true, product: { select: { nazev: true } } } } },
  },
};

type RadekZadosti = {
  orderItem: { variant: { velikost: string; product: { nazev: string } } } | null;
};

/** „Hedvábné šaty Bellissima (M)" – nebo `null`, když se reklamuje celá objednávka. */
function popisPolozky(r: RadekZadosti): string | null {
  if (!r.orderItem) return null;
  const { velikost, product } = r.orderItem.variant;
  return `${product.nazev} (${velikost})`;
}

const NENALEZENO =
  'Žádost jsme podle zadaných údajů nenašli. Zkontrolujte prosím číslo objednávky a e-mail, ' +
  'který jste u ní použila.';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    /* Stejně přísný limit jako u reklamačního formuláře: dvojice číslo +
       e-mail se dá zkoušet hrubou silou a čísla objednávek jdou po sobě. */
    const limit = zkontrolovatLimit(`reklamace-stav:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = klicSchema.parse({
      token: url.searchParams.get('token') ?? undefined,
      cisloObjednavky: url.searchParams.get('cisloObjednavky') ?? undefined,
      email: url.searchParams.get('email') ?? undefined,
    });

    /* Cesta 1: přímý odkaz na jednu žádost. Token je náhodný cuid, takže se
       hledá rovnou podle něj – objednávku k němu dohledáme přes relaci. */
    if (vstup.token) {
      const jedna = await db.reklamace.findUnique({
        where: { token: vstup.token },
        select: { ...VYBER, order: { select: { cisloObjednavky: true } } },
      });

      if (!jedna) return odpovedOk({ nalezeno: false, zprava: NENALEZENO });

      const { order, orderItem, ...zbytek } = jedna;
      return odpovedOk({
        nalezeno: true,
        cisloObjednavky: order.cisloObjednavky,
        zadosti: [{ ...zbytek, polozka: popisPolozky({ orderItem }) }],
      });
    }

    /* Cesta 2: číslo objednávky + e-mail. Autorizaci dělá `najitObjednavkuKlicem`,
       tentýž kód jako u odstoupení a reklamačního formuláře. */
    const klic: VerejnyKlic = {
      cisloObjednavky: (vstup.cisloObjednavky as string).trim(),
      email: (vstup.email as string).trim().toLowerCase(),
    };

    const objednavka = await najitObjednavkuKlicem(klic);

    /*
     * „Nenašli jsme" je jedna odpověď pro neexistující objednávku, špatný
     * e-mail i objednávku bez reklamace. Rozlišit je by z endpointu udělalo
     * nástroj na zjišťování, která čísla objednávek existují.
     */
    if (!objednavka) return odpovedOk({ nalezeno: false, zprava: NENALEZENO });

    const zadosti = await db.reklamace.findMany({
      where: { orderId: objednavka.id },
      orderBy: { datumPrijeti: 'desc' },
      select: VYBER,
    });

    if (zadosti.length === 0) {
      return odpovedOk({
        nalezeno: false,
        zprava:
          'K téhle objednávce zatím žádnou reklamaci ani vrácení neevidujeme. ' +
          'Pokud jste žádost právě odeslala, zkuste to prosím za chvíli.',
      });
    }

    return odpovedOk({
      nalezeno: true,
      cisloObjednavky: objednavka.cisloObjednavky,
      zadosti: zadosti.map(({ orderItem, ...zbytek }) => ({
        ...zbytek,
        polozka: popisPolozky({ orderItem }),
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
