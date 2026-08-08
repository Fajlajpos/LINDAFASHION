import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { profilSchema } from '@/lib/validations/ucet';

export const dynamic = 'force-dynamic';

/**
 * Profil přihlášené zákaznice.
 *
 * Do téhle chvíle šla jména a telefon zapsat jedině při registraci nebo
 * z administrace – zákaznice si po překlepu ve jméně nemohla pomoct sama
 * a souhlas s novinkami odvolala jedině smazáním celého účtu.
 */
export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    return odpovedOk({ profil: uzivatel });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** PATCH – úprava jména, telefonu a souhlasu s newsletterem. */
export async function PATCH(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const vstup = profilSchema.parse(await request.json());

    const profil = await db.user.update({
      where: { id: uzivatel.id },
      data: {
        jmeno: vstup.jmeno,
        telefon: vstup.telefon,
        // `undefined` = pole nepřišlo, hodnotu necháváme být.
        ...(vstup.newsletterSouhlas === undefined
          ? {}
          : { newsletterSouhlas: vstup.newsletterSouhlas }),
      },
      select: {
        id: true,
        email: true,
        jmeno: true,
        telefon: true,
        role: true,
        newsletterSouhlas: true,
      },
    });

    /*
     * Odvolaný souhlas musí platit i pro odběr vedený mimo účet. Kdyby se
     * zákaznice kdysi přihlásila k novinkám bez registrace, zůstal by ten
     * záznam aktivní a přepínač v účtu by ji uklidnil, aniž by cokoliv změnil.
     */
    if (vstup.newsletterSouhlas === false) {
      await db.newsletterSubscriber.updateMany({
        where: { email: profil.email, odhlasenAt: null },
        data: { odhlasenAt: new Date() },
      });
    }

    return odpovedOk({ profil, zprava: 'Údaje jsme uložili.' });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
