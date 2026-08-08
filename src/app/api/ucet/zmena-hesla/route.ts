import { db } from '@/lib/db';
import { overitUzivatele, prihlasit } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/hesla';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { zmenaHeslaSchema } from '@/lib/validations/ucet';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ucet/zmena-hesla – změna hesla přihlášené zákaznice.
 *
 * Do téhle chvíle vedla k novému heslu jediná cesta: „zapomenuté heslo"
 * s odkazem v e-mailu. Jenže odesílání e-mailů zatím není zapojené, takže
 * si heslo fakticky nešlo změnit vůbec.
 *
 * Po změně se zvýší `tokenVerze`, čímž se odhlásí všechna ostatní zařízení –
 * a hned se vystaví nová cookie, aby si zákaznice neodhlásila sama sebe.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    // Brzda na hádání stávajícího hesla u odemčeného prohlížeče.
    const limit = zkontrolovatLimit(`zmena-hesla:${uzivatel.id}`, 10, 15 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = zmenaHeslaSchema.parse(await request.json());

    const ucet = await db.user.findUnique({
      where: { id: uzivatel.id },
      select: { id: true, passwordHash: true },
    });

    if (!ucet || !(await verifyPassword(vstup.stareHeslo, ucet.passwordHash))) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 401, {
        stareHeslo: 'Stávající heslo nesouhlasí.',
      });
    }

    /*
     * Nové heslo a zneplatnění dosavadních relací jedním zápisem. Kdyby se
     * `tokenVerze` zvyšovala až samostatným dotazem a proces mezi tím spadl,
     * běžela by cizí relace dál až do vypršení tokenu – tedy 30 dní. Zrovna
     * u měněného hesla je to ten okamžik, na kterém záleží nejvíc.
     */
    const zmeneny = await db.user.update({
      where: { id: ucet.id },
      data: {
        passwordHash: await hashPassword(vstup.heslo),
        tokenVerze: { increment: 1 },
      },
      select: { id: true, email: true, jmeno: true, role: true, tokenVerze: true },
    });

    // Vlastní relaci obnovíme na novou verzi, jinak by se zákaznice změnou
    // hesla odhlásila i tady a spadla na přihlašovací stránku.
    await prihlasit(zmeneny);

    return odpovedOk({
      zprava: 'Heslo jsme změnili. Na ostatních zařízeních vás pro jistotu odhlásíme.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
