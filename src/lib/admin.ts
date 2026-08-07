/**
 * Pomůcky pro administraci: kontrola role a audit log.
 *
 * Middleware sice `/api/admin/*` hlídá, ale role se kontroluje i tady –
 * kdyby se někdy změnil `matcher`, endpointy nesmí zůstat nechráněné.
 */
import { overitUzivatele, type OverenyUzivatel } from './auth';
import { db } from './db';
import { odpovedChyba } from './api';

/**
 * Ověří, že volající je administrátor – proti databázi, ne jen podle tokenu.
 *
 * Dřív se role četla ze session tokenu. Ten platí 30 dní, takže odebrání práv
 * (nebo smazání účtu) by se projevilo až po jeho vypršení. Tady se pokaždé
 * ověří i `tokenVerze`, takže zneplatnění relace zabere okamžitě.
 */
export async function overitAdmina(): Promise<OverenyUzivatel | null> {
  const uzivatel = await overitUzivatele();
  return uzivatel && uzivatel.role === 'ADMIN' ? uzivatel : null;
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
