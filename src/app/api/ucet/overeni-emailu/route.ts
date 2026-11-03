import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { zkontrolovatLimit } from '@/lib/rate-limit';
import { poslatOvereniEmailu } from '@/lib/overeni-emailu-odeslat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ucet/overeni-emailu – znovu poslat odkaz k ověření e-mailu.
 *
 * Limit je na účet, ne na IP: brzdí zahlcení cizí schránky z jednoho účtu,
 * a adresa, kam zpráva jde, je vždy ta na účtu – jinou sem poslat nejde.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    if (uzivatel.emailOveren) {
      return odpovedOk({ zprava: 'Váš e-mail už je ověřený.', overeno: true });
    }

    const limit = zkontrolovatLimit(`overeni-emailu:${uzivatel.id}`, 3, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba(
        'Odkaz jsme vám už několikrát poslali. Zkontrolujte prosím i složku se spamem, nebo to zkuste za hodinu.',
        429
      );
    }

    const ucet = await db.user.findUnique({
      where: { id: uzivatel.id },
      select: { id: true, email: true, jmeno: true },
    });
    if (!ucet) return odpovedChyba('Nejste přihlášeni.', 401);

    await poslatOvereniEmailu(ucet);

    return odpovedOk({
      zprava: `Odkaz k ověření jsme poslali na ${ucet.email}.`,
      overeno: false,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
