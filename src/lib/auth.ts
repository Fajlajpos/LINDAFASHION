/**
 * Autentizace v kontextu Next.js requestu (čtení session cookie).
 *
 * Rozdělení souborů je záměrné:
 *   session.ts          – práce s JWT, Edge-safe (importuje middleware)
 *   hesla.ts            – bcrypt, bez vazby na Next.js (importuje i worker)
 *   admin-bootstrap.ts  – prvotní admin účet z .env
 *   auth.ts (tenhle)    – lepidlo pro route handlery a Server Components
 */
import { cookies } from 'next/headers';
import { db } from './db';
import { falesnePorovnani, verifyPassword } from './hesla';
import { SESSION_COOKIE, overitSessionToken, type SessionPayload } from './session';

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

/**
 * Načte aktuálně přihlášeného uživatele z databáze.
 * Použij, když potřebuješ čerstvá data (role se mezitím mohla změnit,
 * účet mohl být smazaný) – jinak stačí `getSession()`.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, jmeno: true, telefon: true, role: true, newsletterSouhlas: true },
  });
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

  if (!user) {
    await falesnePorovnani(heslo);
    return null;
  }

  const sedi = await verifyPassword(heslo, user.passwordHash);
  return sedi ? user : null;
}
