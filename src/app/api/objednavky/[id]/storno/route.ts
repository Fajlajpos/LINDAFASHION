import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/objednavky/[id]/storno – zrušení objednávky zákaznicí (sekce 5).
 *
 * Jde to jen dokud je objednávka ve stavu NOVA. Jakmile ji majitelka začne
 * zpracovávat, tlačítko zmizí a zrušení řeší admin.
 *
 * Zboží se vrací na sklad, slevový kód i poukaz se vrací do původního stavu –
 * jinak by zrušená objednávka trvale ukrojila z limitu kódu.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const objednavka = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!objednavka || objednavka.userId !== uzivatel.id) {
      // Cizí objednávku neprozradíme ani její existencí.
      return odpovedChyba('Objednávka nebyla nalezena.', 404);
    }

    if (objednavka.stav !== 'NOVA') {
      return odpovedChyba(
        'Tuto objednávku už bohužel nelze zrušit sama – zpracování začalo. Napište nám prosím a domluvíme se.',
        409
      );
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: objednavka.id },
        data: { stav: 'ZRUSENA', zrusil: 'ZAKAZNICE' },
      });

      for (const polozka of objednavka.items) {
        await tx.productVariant.update({
          where: { id: polozka.variantId },
          data: { skladem: { increment: polozka.mnozstvi } },
        });
      }

      if (objednavka.discountCodeId) {
        await tx.discountCode.update({
          where: { id: objednavka.discountCodeId },
          data: { pocetPouziti: { decrement: 1 } },
        });
      }

      // Částku vrátíme zpět na poukaz a znovu ho zaktivníme.
      if (objednavka.giftCardId && objednavka.castkaZGiftCard) {
        await tx.giftCard.update({
          where: { id: objednavka.giftCardId },
          data: {
            zustatek: { increment: objednavka.castkaZGiftCard },
            aktivni: true,
          },
        });
      }
    });

    return odpovedOk({ zprava: 'Objednávka byla zrušena a zboží vráceno do nabídky.' });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
