/**
 * Autentizace v kontextu Next.js requestu (čtení session cookie).
 *
 * Rozdělení souborů je záměrné:
 *   session.ts          – práce s JWT, Edge-safe (importuje middleware)
 *   hesla.ts            – bcrypt, bez vazby na Next.js (importuje i worker)
 *   admin-bootstrap.ts  – prvotní admin účet z .env
 *   auth.ts (tenhle)    – lepidlo pro route handlery a Server Components
 *
 * Dvě úrovně ověření, používej podle toho, co je v sázce:
 *
 *   getSession()      – jen dekóduje token, nesahá do databáze. Levné.
 *                       Pro zobrazení jména v hlavičce a podobné drobnosti.
 *   overitUzivatele() – ověří proti databázi, že účet pořád existuje, není
 *                       anonymizovaný a token nebyl zneplatněn. Použij všude,
 *                       kde na oprávnění nebo na datech záleží.
 *
 * Ten rozdíl je podstatný: samotný token je platný 30 dní a odhlášení maže
 * jen cookie. Kdyby se role četla výhradně z tokenu, odebrání admin práv
 * by se projevilo až za měsíc.
 */
import { cookies } from 'next/headers';
import { db } from './db';
import { falesnePorovnani, verifyPassword } from './hesla';
import {
  SESSION_COOKIE,
  overitSessionToken,
  sessionCookieNastaveni,
  vytvoritSessionToken,
  type SessionPayload,
} from './session';

export { hashPassword, verifyPassword } from './hesla';
export { zalozitAdminaPokudChybi } from './admin-bootstrap';

/**
 * Přečte session z cookie. Vrací `null`, když nikdo přihlášený není.
 * Nesahá do databáze – data pochází z podepsaného tokenu.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return overitSessionToken(token);
}

export interface OverenyUzivatel {
  id: string;
  email: string;
  jmeno: string | null;
  telefon: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  newsletterSouhlas: boolean;
}

/**
 * Ověří session proti databázi. Vrací `null`, když:
 *   • nikdo není přihlášený,
 *   • účet mezitím zmizel nebo byl anonymizovaný (GDPR),
 *   • token byl zneplatněn (změna hesla, odebrání práv).
 */
export async function overitUzivatele(): Promise<OverenyUzivatel | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      jmeno: true,
      telefon: true,
      role: true,
      newsletterSouhlas: true,
      tokenVerze: true,
      anonymizovanoAt: true,
    },
  });

  if (!user || user.anonymizovanoAt !== null) return null;
  if (user.tokenVerze !== session.tv) return null;

  const { tokenVerze: _tv, anonymizovanoAt: _a, ...verejne } = user;
  return verejne;
}

/** Zkratka pro `overitUzivatele()` – ponecháno kvůli čitelnosti volání. */
export async function getCurrentUser(): Promise<OverenyUzivatel | null> {
  return overitUzivatele();
}

/**
 * Ověří přihlašovací údaje proti databázi.
 * Vrací `null` jak pro neexistující e-mail, tak pro špatné heslo – volající
 * tak nemůže omylem prozradit, které e-maily jsou registrované.
 */
export async function overitPrihlaseni(email: string, heslo: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Anonymizovaný účet se chová jako neexistující – přihlásit se do něj nejde.
  if (!user || user.anonymizovanoAt !== null) {
    await falesnePorovnani(heslo);
    return null;
  }

  const sedi = await verifyPassword(heslo, user.passwordHash);
  return sedi ? user : null;
}

/**
 * Zneplatní všechna dosud vydaná přihlášení daného uživatele.
 * Volá se při změně a resetu hesla a při odebrání administrátorských práv.
 */
export async function zneplatnitRelace(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { tokenVerze: { increment: 1 } },
  });
}

/**
 * Vystaví session cookie. Jedno místo pro přihlášení, registraci i dokončený
 * reset hesla – aby se někde nezapomnělo na `tokenVerze` a token pak nešel
 * zneplatnit.
 */
export async function prihlasit(user: {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  jmeno: string | null;
  tokenVerze: number;
}): Promise<void> {
  const token = await vytvoritSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    jmeno: user.jmeno,
    tv: user.tokenVerze,
  });

  cookies().set(SESSION_COOKIE, token, sessionCookieNastaveni());
}

/** Smaže session cookie (odhlášení). */
export function odhlasit(): void {
  cookies().set(SESSION_COOKIE, '', sessionCookieNastaveni(0));
}
