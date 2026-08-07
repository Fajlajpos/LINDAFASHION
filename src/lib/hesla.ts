/**
 * Hashování hesel (sekce 10 zadání) – schválně samostatně, bez vazby na Next.js.
 *
 * Importuje to jak `web` (přihlášení, registrace), tak `worker` a CLI skripty.
 * Kdyby to sedělo v `auth.ts`, přitáhlo by to s sebou `next/headers`, který
 * mimo request kontext Next.js neexistuje – a build workeru by se rozbil.
 */
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(heslo: string): Promise<string> {
  return bcrypt.hash(heslo, BCRYPT_ROUNDS);
}

export async function verifyPassword(heslo: string, hash: string): Promise<boolean> {
  return bcrypt.compare(heslo, hash);
}

/**
 * Porovnání proti neplatnému hashi. Používá se, když účet neexistuje – aby
 * odpověď trvala zhruba stejně dlouho jako u existujícího účtu a nešlo
 * z časování vyčíst, které e-maily jsou registrované.
 */
export async function falesnePorovnani(heslo: string): Promise<void> {
  await bcrypt.compare(heslo, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
}
