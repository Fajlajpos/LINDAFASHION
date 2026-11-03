import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { potvrzeniEmailuSchema } from '@/lib/validations/ucet';
import { overitTokenOvereni } from '@/lib/overeni-emailu';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ucet/overeni-emailu/potvrzeni – dokončení ověření e-mailu.
 *
 * **Přihlášení se nevyžaduje** – odkaz se otevírá z pošty, klidně na jiném
 * zařízení. Důkazem je podepsaný token, ne session.
 *
 * **Je to POST, ne GET**, ze stejného důvodu jako potvrzení newsletteru:
 * náhledový robot poštovního klienta otevírá odkazy sám a ověřil by adresu
 * dřív, než zprávu kdokoli přečte.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`overeni-emailu-potvrzeni:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const { token } = potvrzeniEmailuSchema.parse(await request.json());
    const overeni = await overitTokenOvereni(token);

    const neplatny = () =>
      odpovedChyba(
        'Odkaz je neplatný nebo už vypršel. Nový si můžete poslat ze svého účtu.',
        410
      );

    if (!overeni) return neplatny();

    /*
     * Ověřuje se jen adresa, pro kterou token vznikl. Po změně e-mailu na účtu
     * by jinak starý odkaz „ověřil“ novou adresu, ke které nikdo nic neprokázal.
     * Podmínky jsou přímo ve `where`, takže mezi kontrolou a zápisem nezůstane
     * okno, ve kterém by se e-mail stihl změnit.
     */
    const ucet = await db.user.findUnique({
      where: { id: overeni.userId },
      select: { email: true, emailOverenoAt: true, anonymizovanoAt: true },
    });

    if (!ucet || ucet.anonymizovanoAt !== null || ucet.email.toLowerCase() !== overeni.email.toLowerCase()) {
      return neplatny();
    }

    if (ucet.emailOverenoAt === null) {
      await db.user.updateMany({
        where: {
          id: overeni.userId,
          email: ucet.email,
          anonymizovanoAt: null,
          emailOverenoAt: null,
        },
        data: { emailOverenoAt: new Date() },
      });
    }

    return odpovedOk({ email: ucet.email, zprava: 'Hotovo – váš e-mail je ověřený.' });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
