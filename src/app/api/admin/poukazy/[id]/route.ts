import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const schema = z.object({ aktivni: z.boolean() });

/**
 * PATCH /api/admin/poukazy/[id] – zapnutí nebo vypnutí poukazu.
 *
 * Jediné, co se na poukazu smí měnit. Zůstatek tu schválně **nejde nastavit**:
 * mění ho jenom objednávka (v transakci, s podmínkou uvnitř `UPDATE`, aby ho
 * dvě souběžné objednávky neutratily dvakrát) a storno, které ho vrací zpět.
 * Ruční přepis by tuhle kontrolu obešel a z evidence by nešlo vyčíst, kam
 * peníze zmizely.
 *
 * DELETE tu není. Vyčerpaný poukaz je stopa po zaplacené objednávce
 * (`Order.giftCardId`) – smazáním by z účetního dokladu zmizelo, čím se
 * platilo. Ztracený kód se řeší deaktivací.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    const poukaz = await db.giftCard.findUnique({
      where: { id: params.id },
      select: { id: true, kod: true, zustatek: true },
    });

    if (!poukaz) return odpovedChyba('Poukaz nebyl nalezen.', 404);

    /*
     * Vyčerpaný poukaz nejde „zapnout". Deaktivaci na nule provádí sama
     * objednávka a znovuzapnutí by vyrobilo kód, který se v pokladně tváří
     * jako platný, ale nemá co strhnout – zákaznice ho zadá a dostane
     * hlášku o vyčerpání. Lepší je nepustit to sem.
     */
    if (vstup.aktivni && Number(poukaz.zustatek) <= 0) {
      return odpovedChyba(
        'Vyčerpaný poukaz nejde znovu aktivovat. Vystavte prosím nový.',
        409
      );
    }

    await db.giftCard.update({
      where: { id: params.id },
      data: { aktivni: vstup.aktivni },
    });

    await zapsatDoAuditu(
      admin.email,
      vstup.aktivni ? 'poukaz.aktivovan' : 'poukaz.deaktivovan',
      'GiftCard',
      params.id,
      { nazev: poukaz.kod }
    );

    return odpovedOk({ upraveno: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
