import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { adresaSchema } from '@/lib/validations/ucet';
import { MAX_ADRES, nacistAdresy } from '@/lib/adresy';

export const dynamic = 'force-dynamic';

/**
 * Uložené adresy zákaznice (sekce 7 zadání) – výpis a založení.
 * Načítání a strop na počet leží v `lib/adresy.ts`; Next.js z route handleru
 * jiný než povolený export nepustí.
 */

export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    return odpovedOk({ adresy: await nacistAdresy(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – založení nové adresy. */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const vstup = adresaSchema.parse(await request.json());

    const pocet = await db.address.count({ where: { userId: uzivatel.id } });
    if (pocet >= MAX_ADRES) {
      return odpovedChyba(
        `Uložit lze nejvýš ${MAX_ADRES} adres. Smažte prosím některou z těch, které už nepoužíváte.`,
        409
      );
    }

    // První adresa daného typu je výchozí sama od sebe – jinak by zákaznice
    // musela zvlášť zaškrtnout něco, co nemá alternativu.
    const prvniSvehoTypu =
      (await db.address.count({ where: { userId: uzivatel.id, typ: vstup.typ } })) === 0;

    const jeVychozi = vstup.jeVychozi || prvniSvehoTypu;

    const adresa = await db.$transaction(async (tx) => {
      // Výchozí adresa je jedna na typ. Kdyby jich bylo víc, pokladna by
      // nevěděla, kterou předvyplnit.
      if (jeVychozi) {
        await tx.address.updateMany({
          where: { userId: uzivatel.id, typ: vstup.typ, jeVychozi: true },
          data: { jeVychozi: false },
        });
      }

      return tx.address.create({
        data: {
          userId: uzivatel.id,
          jmenoPrijmeni: vstup.jmenoPrijmeni,
          ulice: vstup.ulice,
          mesto: vstup.mesto,
          psc: vstup.psc,
          zeme: vstup.zeme.toUpperCase(),
          telefon: vstup.telefon,
          typ: vstup.typ,
          jeVychozi,
        },
        select: { id: true },
      });
    });

    return odpovedOk({ id: adresa.id, adresy: await nacistAdresy(uzivatel.id) }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
