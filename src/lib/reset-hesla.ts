/**
 * Obnova zapomenutého hesla (sekce 5 zadání).
 *
 * Do databáze se ukládá jen SHA-256 otisk tokenu, nikdy token samotný.
 * Kdyby se někdo dostal k databázi, z uložených dat odkaz nesestaví –
 * stejný princip jako u hesel, jen bez potřeby pomalého bcryptu (token je
 * dostatečně dlouhý a náhodný, slovníkový útok na něj nedává smysl).
 */
import crypto from 'crypto';
import { db } from './db';

/** Odkaz platí hodinu – dost času na přečtení e-mailu, málo na zneužití. */
export const PLATNOST_MINUT = 60;

export function vytvoritResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: otisk(token) };
}

export function otisk(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Založí nový token a zneplatní všechny starší nepoužité – aby po několika
 * žádostech fungoval vždy jen ten poslední odeslaný odkaz.
 */
export async function zalozitReset(userId: string): Promise<string> {
  const { token, tokenHash } = vytvoritResetToken();

  await db.$transaction([
    db.passwordReset.updateMany({
      where: { userId, pouzitoAt: null },
      data: { pouzitoAt: new Date() },
    }),
    db.passwordReset.create({
      data: {
        userId,
        tokenHash,
        platnyDo: new Date(Date.now() + PLATNOST_MINUT * 60 * 1000),
      },
    }),
  ]);

  return token;
}

export interface PlatnyReset {
  id: string;
  userId: string;
}

/** Vrátí záznam, pokud je token platný, nepoužitý a nevypršel. */
export async function overitResetToken(token: string): Promise<PlatnyReset | null> {
  if (!token || token.length < 20) return null;

  const zaznam = await db.passwordReset.findUnique({
    where: { tokenHash: otisk(token) },
    select: { id: true, userId: true, platnyDo: true, pouzitoAt: true },
  });

  if (!zaznam) return null;
  if (zaznam.pouzitoAt !== null) return null;
  if (zaznam.platnyDo.getTime() < Date.now()) return null;

  return { id: zaznam.id, userId: zaznam.userId };
}

/** Úklid prošlých a použitých tokenů, ať tabulka neroste donekonečna. */
export async function uklidResetTokenu(): Promise<number> {
  const { count } = await db.passwordReset.deleteMany({
    where: {
      OR: [
        { platnyDo: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { pouzitoAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  return count;
}
