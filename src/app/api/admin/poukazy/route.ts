import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { vygenerovatKodPoukazu } from '@/lib/poukazy';

export const dynamic = 'force-dynamic';

/**
 * Správa dárkových poukazů (sekce 6.11).
 *
 * Poukazy do téhle chvíle nešly z administrace **vůbec** ovládat. Vznikaly
 * jedině ve workeru po zaplacení objednávky, a tím to skončilo: majitelka
 * neviděla zůstatky, nemohla poukaz vystavit ručně (typicky jako kompenzaci
 * k reklamaci) ani zneplatnit ztracený kód.
 *
 * ## Co se smí a co ne
 *
 * Poukaz je platidlo na doručitele, takže se z něj dá udělat jen dvojí:
 * vystavit nový a **deaktivovat** existující. Změna zůstatku tu není a nebude –
 * zůstatek mění jedině objednávka (v transakci, s podmínkou uvnitř `UPDATE`)
 * a storno. Ruční přepis by tu kontrolu obešel a hlavně by nešlo dohledat,
 * kam peníze zmizely.
 *
 * Mazání tu taky není. Vyčerpaný poukaz je stopa po zaplacené objednávce
 * (`Order.giftCardId`); smazáním by z dokladu zmizelo, čím se platilo.
 */

const datum = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'Neplatné datum.' });

const schema = z.object({
  castka: z.coerce
    .number()
    .int('Částka musí být celé číslo korun.')
    .min(1, 'Částka musí být aspoň 1 Kč.')
    .max(100000, 'Částka je příliš vysoká.'),
  platnyDo: datum,
  /** Kvůli auditu: proč poukaz vznikl. Do e-shopu se to nikde nepropisuje. */
  duvod: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function GET(request: Request) {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const hledat = new URL(request.url).searchParams.get('hledat')?.trim().toUpperCase();

    const poukazy = await db.giftCard.findMany({
      // Podle kódu se hledá tehdy, když zákaznice volá „nefunguje mi tenhle".
      // `contains` proto, že si obvykle přečte jen část.
      where: hledat ? { kod: { contains: hledat } } : undefined,
      orderBy: { createdAt: 'desc' },
      // Poukazy se nemažou, takže bez limitu by odpověď rostla navždy.
      take: 200,
      include: {
        vytvorenoZObjednavky: {
          select: { order: { select: { id: true, cisloObjednavky: true } } },
        },
        _count: { select: { orders: true } },
      },
    });

    return odpovedOk({
      poukazy: poukazy.map((p) => ({
        id: p.id,
        kod: p.kod,
        castka: Number(p.castka),
        zustatek: Number(p.zustatek),
        platnyDo: p.platnyDo,
        aktivni: p.aktivni,
        createdAt: p.createdAt,
        // Prázdné = vystavila majitelka ručně. Jinak vznikl nákupem.
        zObjednavky: p.vytvorenoZObjednavky?.order ?? null,
        pocetPouziti: p._count.orders,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – ruční vystavení poukazu. Kód generuje server, ne formulář. */
export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    /*
     * Kód se nezadává ručně. U slevového kódu to smysl dává – je to
     * marketingové heslo, které se tiskne do letáku. Poukaz je platidlo:
     * uhodnutelný kód („VANOCE2026") by znamenal, že si ho někdo vyzkouší
     * v pokladně a utratí cizí peníze. `vygenerovatKodPoukazu()` dělá
     * dvanáct znaků z náhodných bajtů.
     *
     * Kolize je krajně nepravděpodobná, ale unikátní index by ji odmítl –
     * proto pár pokusů, stejně jako ve workeru.
     */
    for (let pokus = 0; pokus < 5; pokus++) {
      const kod = vygenerovatKodPoukazu();

      try {
        const vytvoreny = await db.giftCard.create({
          data: {
            kod,
            castka: new Prisma.Decimal(vstup.castka),
            zustatek: new Prisma.Decimal(vstup.castka),
            platnyDo: vstup.platnyDo,
          },
        });

        await zapsatDoAuditu(admin.email, 'poukaz.vystaven', 'GiftCard', vytvoreny.id, {
          nazev: vytvoreny.kod,
          castka: vstup.castka,
          duvod: vstup.duvod,
        });

        return odpovedOk(
          {
            poukaz: {
              id: vytvoreny.id,
              kod: vytvoreny.kod,
              castka: Number(vytvoreny.castka),
              zustatek: Number(vytvoreny.zustatek),
              platnyDo: vytvoreny.platnyDo,
              aktivni: vytvoreny.aktivni,
              createdAt: vytvoreny.createdAt,
              zObjednavky: null,
              pocetPouziti: 0,
            },
          },
          201
        );
      } catch (err) {
        const kolize =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          String(err.meta?.target ?? '').includes('kod');

        if (!kolize || pokus === 4) throw err;
      }
    }

    // Sem se dostaneme jen kdyby pětkrát po sobě padla shoda kódu.
    throw new Error('Nepodařilo se přidělit kód poukazu.');
  } catch (err) {
    return zpracovatChybu(err);
  }
}
