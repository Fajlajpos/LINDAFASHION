/**
 * Zařazení ověřovacího e-mailu do fronty.
 *
 * Samostatně od `overeni-emailu.ts`, aby tamten zůstal čistý (jen podpis
 * a ověření tokenu) a šel testovat bez fronty.
 */
import { adresaWebu } from './adresa-webu';
import { FRONTY, publishJob } from './queue';
import { PLATNOST_DNU, vytvoritTokenOvereni } from './overeni-emailu';

export async function poslatOvereniEmailu(ucet: {
  id: string;
  email: string;
  jmeno: string | null;
}): Promise<void> {
  const token = await vytvoritTokenOvereni({ userId: ucet.id, email: ucet.email });
  const odkaz = `${adresaWebu()}/overeni-emailu?t=${encodeURIComponent(token)}`;

  await publishJob(FRONTY.ODESLAT_EMAIL, {
    typ: 'overeni-emailu',
    to: ucet.email,
    subject: 'Ověřte prosím svůj e-mail – LINDA FASHION',
    data: { odkaz, jmeno: ucet.jmeno, platnostDnu: PLATNOST_DNU },
  });
}
