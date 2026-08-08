import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { odpovedNeautorizovano, overitAdmina } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const schema = z.object({ vyrizeno: z.boolean() });

/**
 * PATCH /api/admin/zpravy/[id] – přepnutí zprávy na vyřízenou a zpět.
 *
 * Role se ověřuje i tady, ne jen v middleware: kdyby se někdy změnil jeho
 * `matcher`, endpoint nesmí zůstat otevřený.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    const { vyrizeno } = schema.parse(await request.json());

    await db.contactMessage.update({
      where: { id: params.id },
      data: { vyrizeno },
    });

    return odpovedOk({ vyrizeno });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
