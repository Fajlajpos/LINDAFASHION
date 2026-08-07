import { cookies } from 'next/headers';
import { overitPrihlaseni } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieNastaveni, vytvoritSessionToken } from '@/lib/session';
import { prihlaseniSchema } from '@/lib/validations/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, vynulovatLimit, zkontrolovatLimit } from '@/lib/rate-limit';

/** Sekce 10: ochrana proti brute-force – 10 pokusů za 15 minut z jedné IP. */
const MAX_POKUSU = 10;
const OKNO_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) {
      return odpovedChyba('Neplatný požadavek.', 403);
    }

    const limit = zkontrolovatLimit(`prihlaseni:${klientskaIp(request)}`, MAX_POKUSU, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba(
        `Příliš mnoho pokusů o přihlášení. Zkuste to prosím za ${Math.ceil(limit.zkusitZaSekund / 60)} minut.`,
        429
      );
    }

    const vstup = prihlaseniSchema.parse(await request.json());
    const user = await overitPrihlaseni(vstup.email, vstup.heslo);

    if (!user) {
      // Schválně nerozlišujeme "neznámý e-mail" a "špatné heslo", ať nejde
      // zjistit, které e-maily jsou u nás registrované.
      return odpovedChyba('Nesprávný e-mail nebo heslo.', 401);
    }

    vynulovatLimit(`prihlaseni:${klientskaIp(request)}`);

    const token = await vytvoritSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      jmeno: user.jmeno,
    });

    cookies().set(SESSION_COOKIE, token, sessionCookieNastaveni());

    return odpovedOk({
      uzivatel: { id: user.id, email: user.email, jmeno: user.jmeno, role: user.role },
      // Admina pošleme rovnou do administrace, zákaznici na její účet.
      presmerovat: user.role === 'ADMIN' ? '/admin' : '/muj-ucet',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
