import { z } from 'zod';
import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';

export const dynamic = 'force-dynamic';

const slugSchema = z.object({ slug: z.string().min(1).max(120) });
const slouceniSchema = z.object({ slugy: z.array(z.string().min(1).max(120)).max(200) });

/**
 * Oblíbené produkty přihlášené zákaznice (sekce 5 zadání).
 *
 * Klient pracuje se `slug`em, databáze s `productId` – převod je tady, aby
 * frontend nemusel znát interní id. Nepřihlášená zákaznice má oblíbené jen
 * v prohlížeči; po přihlášení se obojí sloučí.
 */

async function vratitOblibene(userId: string) {
  const oblibene = await db.favorite.findMany({
    where: { userId, product: { aktivni: true } },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          category: { select: { nazev: true } },
          images: {
            where: { stavZpracovani: 'HOTOVO' },
            orderBy: [{ jeHlavni: 'desc' }, { poradi: 'asc' }],
            take: 1,
            select: { urlMedium: true },
          },
        },
      },
    },
  });

  return oblibene.map((o) => ({
    slug: o.product.slug,
    nazev: o.product.nazev,
    cena: Number(o.product.cena),
    cenaPoSleve: o.product.cenaPoSleve === null ? null : Number(o.product.cenaPoSleve),
    znacka: o.product.znacka,
    kategorieNazev: o.product.category.nazev,
    obrazekUrl: o.product.images[0]?.urlMedium ?? null,
    jeDarkovyPoukaz: o.product.jeDarkovyPoukaz,
  }));
}

export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedOk({ prihlasen: false, oblibene: [] });

    return odpovedOk({ prihlasen: true, oblibene: await vratitOblibene(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – přidání jednoho produktu, nebo sloučení celého seznamu po přihlášení. */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    /*
     * Operátor `in` na čemkoliv jiném než objektu hodí TypeError – tělo
     * `null`, `"ahoj"` nebo `5` tady dřív skončilo jako chyba 500 místo
     * srozumitelné validační hlášky. `request.json()` navíc `null` klidně vrátí.
     */
    const telo: unknown = await request.json();
    if (telo === null || typeof telo !== 'object') {
      return odpovedChyba('Neplatný formát požadavku.', 400);
    }

    const slugy =
      'slugy' in telo ? slouceniSchema.parse(telo).slugy : [slugSchema.parse(telo).slug];

    if (slugy.length > 0) {
      const produkty = await db.product.findMany({
        where: { slug: { in: slugy }, aktivni: true },
        select: { id: true },
      });

      // `skipDuplicates` řeší opakované přidání téhož produktu – unikátní
      // index na (userId, productId) by jinak hodil chybu.
      await db.favorite.createMany({
        data: produkty.map((p) => ({ userId: uzivatel.id, productId: p.id })),
        skipDuplicates: true,
      });
    }

    return odpovedOk({ prihlasen: true, oblibene: await vratitOblibene(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const { slug } = slugSchema.parse(await request.json());

    const produkt = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (produkt) {
      await db.favorite.deleteMany({ where: { userId: uzivatel.id, productId: produkt.id } });
    }

    return odpovedOk({ prihlasen: true, oblibene: await vratitOblibene(uzivatel.id) });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
