import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { zaznamenatSouhlas } from '@/lib/souhlasy';

export const dynamic = 'force-dynamic';

/**
 * Odhlášení z odběru novinek.
 *
 * Každé obchodní sdělení musí nést funkční odhlašovací odkaz – sloupec
 * `odhlasenAt` v databázi od začátku byl, ale nic ho neumělo nastavit.
 *
 * Odkaz nese **token**, ne e-mail. S adresou v URL by kdokoliv odhlásil
 * kohokoliv, komu uhodne e-mail; token je náhodný a patří k jedinému záznamu.
 *
 * Rozdělení na GET a POST je záměrné: GET jen řekne, čí je to odběr, samotné
 * odhlášení dělá až POST. Kdyby odhlašoval GET, provedl by ho každý
 * náhledový robot poštovního klienta, který si odkaz v e-mailu předběžně
 * načte – zákaznice by přišla o odběr, aniž by na cokoliv klikla.
 */

const schema = z.object({
  token: z.string().min(10, 'Odkaz je neplatný.').max(200),
});

/** Zakryje adresu na `p***a@seznam.cz` – potvrdí, o čí odběr jde, bez vypsání. */
function zakrytEmail(email: string): string {
  const [jmeno, domena] = email.split('@');
  if (!domena) return '***';

  const viditelne = jmeno.length <= 2 ? jmeno.slice(0, 1) : `${jmeno[0]}***${jmeno[jmeno.length - 1]}`;
  return `${viditelne}@${domena}`;
}

/** GET ?token= – ověření odkazu, aby stránka věděla, co zobrazit. */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
    if (!token) return odpovedOk({ platny: false });

    const limit = zkontrolovatLimit(`odhlaseni:${klientskaIp(request)}`, 30, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho požadavků. Zkuste to prosím za chvíli.', 429);
    }

    const odberatel = await db.newsletterSubscriber.findUnique({
      where: { token },
      select: { email: true, odhlasenAt: true },
    });

    if (!odberatel) return odpovedOk({ platny: false });

    return odpovedOk({
      platny: true,
      email: zakrytEmail(odberatel.email),
      jizOdhlasen: odberatel.odhlasenAt !== null,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – vlastní odhlášení. */
export async function POST(request: Request) {
  try {
    /*
     * `jeStejnyPuvod` se tu schválně nevolá. Odkaz se otevírá z e-mailu,
     * takže požadavek přichází z čerstvě načtené stránky bez vazby na relaci –
     * a hlavně: odhlášení nikomu neuškodí. Autorizací je samotný token.
     */
    const limit = zkontrolovatLimit(`odhlaseni:${klientskaIp(request)}`, 30, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho požadavků. Zkuste to prosím za chvíli.', 429);
    }

    const { token } = schema.parse(await request.json());

    /*
     * `updateMany`, ne `update`: opakované odeslání (nebo dvojklik) nesmí
     * skončit chybou o nenalezeném záznamu. Podmínka `odhlasenAt: null`
     * zároveň drží původní datum odhlášení, když už jednou proběhlo.
     */
    const zmeneno = await db.newsletterSubscriber.updateMany({
      where: { token, odhlasenAt: null },
      data: { odhlasenAt: new Date(), potvrzeno: false },
    });

    if (zmeneno.count === 0) {
      // Buď token neplatí, nebo už odhlášeno. Rozlišíme to, ale bez e-mailu.
      const existuje = await db.newsletterSubscriber.findUnique({
        where: { token },
        select: { id: true },
      });

      if (!existuje) {
        return odpovedChyba(
          'Tenhle odhlašovací odkaz už neplatí. Pokud vám novinky pořád chodí, ozvěte se nám prosím.',
          404
        );
      }
    }

    /*
     * Souhlas drží u registrovaného účtu `User.newsletterSouhlas`, ne tahle
     * tabulka. Bez tohohle by odhlášení odkazem z e-mailu neudělalo nic,
     * protože rozesílka by dál vycházela z účtu.
     */
    const odberatel = await db.newsletterSubscriber.findUnique({
      where: { token },
      select: { email: true },
    });

    if (odberatel) {
      await db.user.updateMany({
        where: { email: odberatel.email, newsletterSouhlas: true },
        data: { newsletterSouhlas: false },
      });

      /*
       * Odvolání se zapisuje jako **nový** záznam s `udeleno: false`, ne
       * přepsáním toho původního.
       *
       * Čl. 7 odst. 3 GDPR říká, že odvoláním není dotčena zákonnost
       * zpracování před odvoláním – takže správce musí umět ukázat, že souhlas
       * do té chvíle platil. Přepsaný záznam by právě tohle smazal a e-shop by
       * po odhlášení vypadal, jako by rozesílal bez souhlasu od začátku.
       */
      await zaznamenatSouhlas({
        typ: 'NEWSLETTER',
        subjekt: odberatel.email,
        udeleno: false,
        podrobnosti: { krok: 'odhlaseni' },
        ip: klientskaIp(request),
        userAgent: request.headers.get('user-agent'),
      });
    }

    return odpovedOk({
      zprava: 'Odhlásili jsme vás z odběru novinek. Je nám líto, že odcházíte.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
