import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { kategorieSchema } from '@/lib/validations/produkt';
import { hledaciNazevKategorie } from '@/lib/vyhledavani';

interface Kontext {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = kategorieSchema.parse(await request.json());

    if (vstup.parentId === params.id) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        parentId: 'Kategorie nemůže být nadřazená sama sobě.',
      });
    }

    // Zabránit cyklu (A → B → A), jinak by se strom kategorií zacyklil
    // při vykreslování navigace.
    if (vstup.parentId) {
      let uzel: string | null = vstup.parentId;
      const navstivene = new Set<string>();

      while (uzel) {
        if (uzel === params.id) {
          return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
            parentId: 'Tím by vznikla zacyklená struktura kategorií.',
          });
        }
        if (navstivene.has(uzel)) break;
        navstivene.add(uzel);

        const rodic: { parentId: string | null } | null = await db.category.findUnique({
          where: { id: uzel },
          select: { parentId: true },
        });
        uzel = rodic?.parentId ?? null;
      }
    }

    const kategorie = await db.category.update({
      where: { id: params.id },
      data: {
        nazev: vstup.nazev.trim(),
        popis: vstup.popis?.trim() || null,
        parentId: vstup.parentId || null,
        poradi: vstup.poradi ?? 0,
        // Přejmenování musí projít i sem – kategorie se hledá podle téhle
        // kopie, ne podle `nazev`.
        hledaciNazev: hledaciNazevKategorie({ nazev: vstup.nazev }),
      },
    });

    await zapsatDoAuditu(admin.email, 'kategorie.upravena', 'Category', params.id, {
      nazev: kategorie.nazev,
    });

    return odpovedOk({ kategorie });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

export async function DELETE(request: Request, { params }: Kontext) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const kategorie = await db.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!kategorie) return odpovedChyba('Kategorie nebyla nalezena.', 404);

    // Produkt má kategorii povinnou, takže smazání kategorie s produkty by
    // buď spadlo na cizím klíči, nebo (při kaskádě) tiše smazalo produkty.
    if (kategorie._count.products > 0) {
      return odpovedChyba(
        `V kategorii je ${kategorie._count.products} produktů. Přesuňte je nejdřív jinam, pak půjde kategorii smazat.`,
        409
      );
    }

    if (kategorie._count.children > 0) {
      return odpovedChyba(
        `Kategorie má ${kategorie._count.children} podkategorií. Smažte nebo přesuňte nejdřív je.`,
        409
      );
    }

    await db.category.delete({ where: { id: params.id } });

    await zapsatDoAuditu(admin.email, 'kategorie.smazana', 'Category', params.id, {
      nazev: kategorie.nazev,
    });

    return odpovedOk({ smazano: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
