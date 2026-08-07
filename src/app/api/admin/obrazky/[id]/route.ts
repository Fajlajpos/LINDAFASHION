import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { smazatVariantyObrazku } from '@/lib/sharp-image';
import { cestaTmp, jePlatnyToken, smazatTise } from '@/lib/uloziste';

interface Kontext {
  params: { id: string };
}

const upravaSchema = z.object({
  jeHlavni: z.boolean().optional(),
  poradi: z.coerce.number().int().min(0).max(999).optional(),
  altText: z.string().max(255).nullable().optional(),
});

/** PATCH – hlavní fotka, pořadí, alt text. */
export async function PATCH(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = upravaSchema.parse(await request.json());

    const obrazek = await db.productImage.findUnique({
      where: { id: params.id },
      select: { id: true, productId: true },
    });

    if (!obrazek) return odpovedChyba('Fotka nebyla nalezena.', 404);

    await db.$transaction(async (tx) => {
      // Hlavní fotka smí být jen jedna – ostatní se u téhož produktu shodí.
      if (vstup.jeHlavni === true) {
        await tx.productImage.updateMany({
          where: { productId: obrazek.productId },
          data: { jeHlavni: false },
        });
      }

      await tx.productImage.update({
        where: { id: params.id },
        data: {
          ...(vstup.jeHlavni !== undefined ? { jeHlavni: vstup.jeHlavni } : {}),
          ...(vstup.poradi !== undefined ? { poradi: vstup.poradi } : {}),
          ...(vstup.altText !== undefined ? { altText: vstup.altText } : {}),
        },
      });
    });

    return odpovedOk({ upraveno: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** DELETE – smaže fotku i všechny její varianty z disku. */
export async function DELETE(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const obrazek = await db.productImage.findUnique({
      where: { id: params.id },
      select: { id: true, productId: true, jeHlavni: true, originalSoubor: true },
    });

    if (!obrazek) return odpovedChyba('Fotka nebyla nalezena.', 404);

    await smazatVariantyObrazku(obrazek.id);
    if (obrazek.originalSoubor && jePlatnyToken(obrazek.originalSoubor)) {
      await smazatTise(cestaTmp(obrazek.originalSoubor));
    }

    await db.productImage.delete({ where: { id: params.id } });

    // Produkt nesmí zůstat bez hlavní fotky – roli přebírá první v pořadí.
    if (obrazek.jeHlavni) {
      const nasledujici = await db.productImage.findFirst({
        where: { productId: obrazek.productId },
        orderBy: { poradi: 'asc' },
        select: { id: true },
      });

      if (nasledujici) {
        await db.productImage.update({ where: { id: nasledujici.id }, data: { jeHlavni: true } });
      }
    }

    await zapsatDoAuditu(admin.email, 'fotka.smazana', 'ProductImage', params.id, {
      productId: obrazek.productId,
    });

    return odpovedOk({ smazano: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
