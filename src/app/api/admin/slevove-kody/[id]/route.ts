import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const schema = z.object({ aktivni: z.boolean() });

/** PATCH – zapnutí/vypnutí kódu. Úpravy hodnoty schválně neumožňujeme:
 *  změna procenta u kódu, který už někdo použil, by rozbila historii slev. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const { aktivni } = schema.parse(await request.json());

    const kod = await db.discountCode.update({
      where: { id: params.id },
      data: { aktivni },
    });

    await zapsatDoAuditu(admin.email, aktivni ? 'slevovy-kod.zapnut' : 'slevovy-kod.vypnut', 'DiscountCode', params.id, {
      nazev: kod.kod,
    });

    return odpovedOk({ aktivni: kod.aktivni });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** DELETE – smazat lze jen kód, který ještě nikdo nepoužil. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const kod = await db.discountCode.findUnique({
      where: { id: params.id },
      include: { _count: { select: { orders: true } } },
    });

    if (!kod) return odpovedChyba('Kód nebyl nalezen.', 404);

    if (kod._count.orders > 0) {
      return odpovedChyba(
        `Kód je použitý v ${kod._count.orders} objednávkách, proto ho nelze smazat – rozbila by se historie. Místo mazání ho vypněte.`,
        409
      );
    }

    await db.discountCode.delete({ where: { id: params.id } });

    await zapsatDoAuditu(admin.email, 'slevovy-kod.smazan', 'DiscountCode', params.id, { nazev: kod.kod });

    return odpovedOk({ smazano: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
