import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const schema = z.object({
  stav: z.enum(['PRIJATA', 'RESI_SE', 'VYRIZENA_UZNANA', 'VYRIZENA_ZAMITNUTA']),
  poznamkaAdmina: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

/**
 * PATCH /api/admin/reklamace/[id] – změna stavu reklamace či vrácení.
 *
 * Sekce 6.10: uznané **vrácení** automaticky vrátí kusy zpátky na sklad
 * a u vrácení celé objednávky přepne její stav na VRACENA. Majitelka to
 * nemá dopočítávat ručně.
 *
 * Uznaná *reklamace* sklad nezvyšuje – vadný kus se zpátky do prodeje nevrací.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    const reklamace = await db.reklamace.findUnique({
      where: { id: params.id },
      include: {
        order: { include: { items: true } },
        orderItem: true,
      },
    });

    if (!reklamace) return odpovedChyba('Záznam nebyl nalezen.', 404);

    const jizVyrizena =
      reklamace.stav === 'VYRIZENA_UZNANA' || reklamace.stav === 'VYRIZENA_ZAMITNUTA';

    // Sklad se smí navýšit jen jednou – opakované uložení téhož stavu
    // by jinak zboží množilo.
    const vracetNaSklad =
      !jizVyrizena && vstup.stav === 'VYRIZENA_UZNANA' && reklamace.typ === 'VRACENI';

    await db.$transaction(async (tx) => {
      await tx.reklamace.update({
        where: { id: params.id },
        data: {
          stav: vstup.stav,
          poznamkaAdmina: vstup.poznamkaAdmina,
          datumVyrizeni:
            vstup.stav === 'VYRIZENA_UZNANA' || vstup.stav === 'VYRIZENA_ZAMITNUTA'
              ? new Date()
              : null,
        },
      });

      if (!vracetNaSklad) return;

      // `orderItemId` je null = vrací se celá objednávka.
      const polozky = reklamace.orderItem ? [reklamace.orderItem] : reklamace.order.items;

      for (const polozka of polozky) {
        await tx.productVariant.update({
          where: { id: polozka.variantId },
          data: { skladem: { increment: polozka.mnozstvi } },
        });
      }

      if (!reklamace.orderItem) {
        await tx.order.update({
          where: { id: reklamace.orderId },
          data: { stav: 'VRACENA' },
        });
      }
    });

    await zapsatDoAuditu(admin.email, 'reklamace.vyrizena', 'Reklamace', params.id, {
      nazev: reklamace.order.cisloObjednavky,
      stav: vstup.stav,
      vracenoNaSklad: vracetNaSklad,
    });

    return odpovedOk({ upraveno: true, vracenoNaSklad: vracetNaSklad });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
