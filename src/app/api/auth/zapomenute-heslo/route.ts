import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { zalozitReset } from '@/lib/reset-hesla';
import { FRONTY, publishJob } from '@/lib/queue';

const schema = z.object({
  email: z.string().min(1, 'Vyplňte prosím e-mail.').email('Tohle nevypadá jako platný e-mail.'),
});

/** 5 žádostí za hodinu z jedné IP – aby se z toho nedal dělat spam nástroj. */
const MAX_ZADOSTI = 5;
const OKNO_MS = 60 * 60 * 1000;

/**
 * POST /api/auth/zapomenute-heslo – odešle odkaz pro obnovu hesla.
 *
 * Odpověď je vždy stejná, i pro neexistující e-mail. Kdyby se lišila, dal by
 * se z formuláře vyčíst seznam registrovaných zákaznic.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`reset:${klientskaIp(request)}`, MAX_ZADOSTI, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho žádostí. Zkuste to prosím za chvíli.', 429);
    }

    const { email } = schema.parse(await request.json());

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, jmeno: true, anonymizovanoAt: true },
    });

    if (user && user.anonymizovanoAt === null) {
      const token = await zalozitReset(user.id);
      const odkaz = `${process.env.APP_URL || 'http://localhost:3000'}/obnova-hesla?token=${token}`;

      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'obnova-hesla',
        to: user.email,
        subject: 'Obnova hesla k účtu LINDA FASHION',
        data: { jmeno: user.jmeno, odkaz },
      });
    }

    return odpovedOk({
      // Formulace schválně nepotvrzuje, že účet existuje.
      zprava:
        'Pokud u nás účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro nastavení nového hesla. ' +
        'Odkaz platí jednu hodinu.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
