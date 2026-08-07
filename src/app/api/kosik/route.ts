import { z } from 'zod';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { nacistKosik, sloucitKosik, upravitPolozku, vyprazdnitKosik } from '@/lib/kosik-server';

export const dynamic = 'force-dynamic';

const polozkaSchema = z.object({
  variantId: z.string().min(1),
  mnozstvi: z.coerce.number().int().min(0).max(99),
});

const slouceniSchema = z.object({
  polozky: z.array(polozkaSchema).max(100),
});

/**
 * GET /api/kosik – košík uložený u účtu.
 *
 * Nepřihlášená zákaznice dostane prázdnou odpověď (ne chybu) – její košík
 * žije jen v prohlížeči a server o něm nic neví.
 */
export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedOk({ prihlasen: false, polozky: [], odebrano: [] });

    const kosik = await nacistKosik(uzivatel.id);
    return odpovedOk({ prihlasen: true, ...kosik });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/**
 * POST /api/kosik – sloučí košík z prohlížeče s tím u účtu.
 *
 * Sloučení, ne přepis: zadání (sekce 5) výslovně chce, aby se oba košíky
 * spojily a jeden druhý nesmazal.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const { polozky } = slouceniSchema.parse(await request.json());
    const kosik = await sloucitKosik(uzivatel.id, polozky);

    return odpovedOk({ prihlasen: true, ...kosik });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** PATCH – změna množství jedné položky (0 = odebrat). */
export async function PATCH(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const { variantId, mnozstvi } = polozkaSchema.parse(await request.json());
    const kosik = await upravitPolozku(uzivatel.id, variantId, mnozstvi);

    return odpovedOk({ prihlasen: true, ...kosik });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** DELETE – vyprázdnění košíku. */
export async function DELETE(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    await vyprazdnitKosik(uzivatel.id);
    return odpovedOk({ prihlasen: true, polozky: [], odebrano: [] });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
