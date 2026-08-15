import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { kategorieSchema } from '@/lib/validations/produkt';
import { unikatniSlug } from '@/lib/slug';
import { hledaciNazevKategorie } from '@/lib/vyhledavani';

export const dynamic = 'force-dynamic';

/** GET – strom kategorií i s počty produktů (sekce 6.3). */
export async function GET() {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const kategorie = await db.category.findMany({
      orderBy: [{ poradi: 'asc' }, { nazev: 'asc' }],
      include: {
        parent: { select: { id: true, nazev: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return odpovedOk({ kategorie });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – nová kategorie, volitelně vnořená pod jinou. */
export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = kategorieSchema.parse(await request.json());

    if (vstup.parentId) {
      const rodic = await db.category.findUnique({ where: { id: vstup.parentId }, select: { id: true } });
      if (!rodic) {
        return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
          parentId: 'Nadřazená kategorie neexistuje.',
        });
      }
    }

    const slug = await unikatniSlug(vstup.nazev, async (kandidat) => {
      const nalezeno = await db.category.findUnique({ where: { slug: kandidat }, select: { id: true } });
      return nalezeno !== null;
    });

    const kategorie = await db.category.create({
      data: {
        nazev: vstup.nazev.trim(),
        slug,
        popis: vstup.popis?.trim() || null,
        parentId: vstup.parentId || null,
        poradi: vstup.poradi ?? 0,
        // Hledání porovnává proti tomuhle sloupci, ne proti `nazev`.
        hledaciNazev: hledaciNazevKategorie({ nazev: vstup.nazev }),
      },
    });

    await zapsatDoAuditu(admin.email, 'kategorie.vytvorena', 'Category', kategorie.id, {
      nazev: kategorie.nazev,
    });

    return odpovedOk({ kategorie }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
