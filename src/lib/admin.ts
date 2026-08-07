/**
 * Pomůcky pro administraci: kontrola role a audit log.
 *
 * Middleware sice `/api/admin/*` hlídá, ale role se kontroluje i tady –
 * kdyby se někdy změnil `matcher`, endpointy nesmí zůstat nechráněné.
 */
import { getSession } from './auth';
import { db } from './db';
import { odpovedChyba } from './api';
import type { SessionPayload } from './session';

export async function overitAdmina(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session && session.role === 'ADMIN' ? session : null;
}

/** Odpověď, kterou vrací endpoint, když volající není admin. */
export function odpovedNeautorizovano() {
  return odpovedChyba('K této akci nemáte oprávnění.', 403);
}

/**
 * Zápis do audit logu (sekce 14). Nikdy neshodí hlavní operaci – když se
 * log nepodaří uložit, jen se to zaloguje do konzole.
 */
export async function zapsatDoAuditu(
  adminEmail: string,
  akce: string,
  entita: string,
  entitaId?: string | null,
  podrobnosti?: Record<string, unknown>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminEmail,
        akce,
        entita,
        entitaId: entitaId ?? null,
        podrobnosti: podrobnosti ? (podrobnosti as object) : undefined,
      },
    });
  } catch (err) {
    console.error('[audit] Nepodařilo se zapsat záznam:', err);
  }
}
