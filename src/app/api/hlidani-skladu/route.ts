import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  variantId: z.string().min(1),
  email: z
    .string()
    .min(1, 'Zadejte prosím e-mail.')
    .email('Zadejte prosím platný e-mail.')
    .max(200)
    .transform((v) => v.trim().toLowerCase()),
});

/**
 * POST /api/hlidani-skladu – „Upozornit, až bude skladem" (sekce 14).
 *
 * Tlačítko na detailu produktu bylo do téhle chvíle natrvalo zakázané, protože
 * nebylo kam poslat. Naplněné hlídání rozesílá worker, jakmile se velikost
 * vrátí na sklad.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`hlidani:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím později.', 429);
    }

    const { variantId, email } = schema.parse(await request.json());

    const varianta = await db.productVariant.findFirst({
      where: { id: variantId, product: { aktivni: true } },
      select: { id: true, skladem: true, velikost: true, product: { select: { nazev: true } } },
    });

    if (!varianta) return odpovedChyba('Tuto velikost už bohužel nenabízíme.', 404);

    if (varianta.skladem > 0) {
      return odpovedChyba(
        `„${varianta.product.nazev} (${varianta.velikost})" je právě teď skladem – stačí ji vložit do košíku.`,
        409
      );
    }

    // Opakované kliknutí nesmí založit hlídání dvakrát; jinak by po naskladnění
    // přišlo několik stejných e-mailů. `vyrizeno: false` zároveň obnoví
    // hlídání, které už jednou proběhlo.
    await db.stockNotification.upsert({
      where: { variantId_email: { variantId, email } },
      update: { vyrizeno: false },
      create: { variantId, email },
    });

    return odpovedOk({
      zprava: 'Hotovo. Napíšeme vám, jakmile bude tato velikost zase skladem.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
