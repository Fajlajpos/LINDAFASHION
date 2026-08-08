import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const vytvoreniSchema = z.object({
  orderId: z.string().min(1),
  orderItemId: z.string().min(1).optional().nullable(),
  typ: z.enum(['REKLAMACE', 'VRACENI']),
  duvod: z.string().max(2000).optional().nullable(),
});

/**
 * Kolik reklamací vydáme naráz.
 *
 * Řazení podle stavu drží nevyřízené nahoře, takže se ořízne vždycky ten
 * nejméně důležitý konec. Bez limitu (dřív tu žádný nebyl) by odpověď rostla
 * s každou vyřízenou reklamací navždy.
 */
const LIMIT = 200;

/** GET – seznam reklamací a vrácení (sekce 6.10). */
export async function GET() {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const [reklamace, celkem] = await Promise.all([
      db.reklamace.findMany({
        orderBy: [{ stav: 'asc' }, { datumPrijeti: 'desc' }],
        take: LIMIT,
        include: {
          order: { select: { id: true, cisloObjednavky: true, dodaciJmenoPrijmeni: true } },
          orderItem: {
            include: { variant: { include: { product: { select: { nazev: true } } } } },
          },
        },
      }),
      db.reklamace.count(),
    ]);

    return odpovedOk({
      celkem,
      reklamace: reklamace.map((r) => ({
        id: r.id,
        typ: r.typ,
        stav: r.stav,
        duvod: r.duvod,
        poznamkaAdmina: r.poznamkaAdmina,
        datumPrijeti: r.datumPrijeti,
        datumVyrizeni: r.datumVyrizeni,
        cisloObjednavky: r.order.cisloObjednavky,
        orderId: r.order.id,
        zakaznik: r.order.dodaciJmenoPrijmeni,
        polozka: r.orderItem
          ? `${r.orderItem.variant.product.nazev} (${r.orderItem.variant.velikost})`
          : null,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – zaevidování nové reklamace nebo vrácení. */
export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = vytvoreniSchema.parse(await request.json());

    const objednavka = await db.order.findUnique({
      where: { id: vstup.orderId },
      select: { id: true, cisloObjednavky: true },
    });

    if (!objednavka) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        orderId: 'Objednávka neexistuje.',
      });
    }

    const reklamace = await db.reklamace.create({
      data: {
        orderId: vstup.orderId,
        orderItemId: vstup.orderItemId || null,
        typ: vstup.typ,
        duvod: vstup.duvod?.trim() || null,
      },
    });

    await zapsatDoAuditu(admin.email, 'reklamace.zalozena', 'Reklamace', reklamace.id, {
      nazev: objednavka.cisloObjednavky,
      typ: vstup.typ,
    });

    return odpovedOk({ id: reklamace.id }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
