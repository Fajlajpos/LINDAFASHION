import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieNastaveni, vytvoritSessionToken } from '@/lib/session';
import { registraceSchema } from '@/lib/validations/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';

/** Sekce 10: 5 registrací za hodinu z jedné IP – brzda na spam boty. */
const MAX_REGISTRACI = 5;
const OKNO_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) {
      return odpovedChyba('Neplatný požadavek.', 403);
    }

    const limit = zkontrolovatLimit(`registrace:${klientskaIp(request)}`, MAX_REGISTRACI, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho registrací z této adresy. Zkuste to prosím později.', 429);
    }

    const vstup = registraceSchema.parse(await request.json());

    const obsazeny = await db.user.findUnique({
      where: { email: vstup.email },
      select: { id: true },
    });

    if (obsazeny) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 409, {
        email: 'Na tento e-mail už účet existuje. Zkuste se přihlásit.',
      });
    }

    const user = await db.user.create({
      data: {
        email: vstup.email,
        passwordHash: await hashPassword(vstup.heslo),
        jmeno: vstup.jmeno?.trim() || null,
        telefon: vstup.telefon?.trim() || null,
        // Souhlas s newsletterem se u registrovaného účtu drží tady, ne
        // v NewsletterSubscriber – ať není souhlas na dvou místech (sekce 5).
        newsletterSouhlas: vstup.newsletterSouhlas ?? false,
      },
      select: { id: true, email: true, jmeno: true, role: true },
    });

    // Kdyby se stejný e-mail dřív přihlásil k newsletteru bez účtu, ať se
    // souhlas nezdvojuje – od téhle chvíle ho drží účet.
    await db.newsletterSubscriber.deleteMany({ where: { email: vstup.email } });

    const token = await vytvoritSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      jmeno: user.jmeno,
    });

    cookies().set(SESSION_COOKIE, token, sessionCookieNastaveni());

    return odpovedOk(
      {
        uzivatel: user,
        presmerovat: '/muj-ucet',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
