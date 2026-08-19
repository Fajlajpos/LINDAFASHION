import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * Správa znění právních dokumentů.
 *
 * **Endpoint umí jen číst a přidávat. PUT ani DELETE tu schválně nejsou.**
 *
 * Text, na který se odkazuje byť jediná objednávka, je důkaz o tom, s čím
 * zákaznice souhlasila. Kdyby šel přepsat, změnil by se zpětně obsah souhlasu,
 * který už byl udělen – přesně to, čemu má archivace znění zabránit. Oprava
 * překlepu se proto dělá novou verzí, ne editací staré. Stejné pravidlo jako
 * u `PriceHistory` a `SouhlasZaznam`.
 *
 * Kdyby sem někdo v budoucnu chtěl doplnit editaci: opravdu ne. Jediná
 * obhajitelná varianta je smazání verze, na kterou **žádná** objednávka
 * neodkazuje, a i to je pohodlí, které za tu past nestojí.
 */

const DRUHY = ['obchodni-podminky', 'reklamacni-rad', 'ochrana-osobnich-udaju'] as const;

const noveZneniSchema = z.object({
  druh: z.enum(DRUHY),
  /*
   * Verze je štítek, který se zapisuje do `Order.verzePodminek`. Doporučené
   * je datum účinnosti; formát se ale nevynucuje, aby šlo navázat na značení,
   * které si majitelka už zavedla.
   */
  verze: z.string().min(1, 'Vyplňte označení verze.').max(60),
  nadpis: z.string().min(1, 'Vyplňte nadpis.').max(200),
  obsah: z.string().min(50, 'Text je podezřele krátký – zkontrolujte, že se vložil celý.').max(200_000),
  ucinnostOd: z
    .string()
    .min(1, 'Vyplňte datum účinnosti.')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Neplatné datum účinnosti.' }),
});

/** GET – seznam všech uložených znění. */
export async function GET() {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const dokumenty = await db.pravniDokument.findMany({
      orderBy: [{ druh: 'asc' }, { ucinnostOd: 'desc' }],
      select: {
        id: true,
        druh: true,
        verze: true,
        nadpis: true,
        ucinnostOd: true,
        createdAt: true,
      },
    });

    /*
     * Kolik objednávek se na kterou verzi podmínek odkazuje. Je to jediné
     * číslo, které v administraci opravdu odpovídá na otázku „smím s tímhle
     * ještě hýbat" – a odpověď je vždycky ne, ale je dobré vidět proč.
     */
    const pouziti = await db.order.groupBy({
      by: ['verzePodminek'],
      _count: { _all: true },
      where: { verzePodminek: { not: null } },
    });

    const podleVerze = new Map(pouziti.map((p) => [p.verzePodminek, p._count._all]));

    return odpovedOk({
      dokumenty: dokumenty.map((d) => ({
        ...d,
        pocetObjednavek: d.druh === 'obchodni-podminky' ? (podleVerze.get(d.verze) ?? 0) : 0,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – nové znění. Nikdy nepřepisuje existující. */
export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = noveZneniSchema.parse(await request.json());

    /*
     * Kolizi verze hlídá i unikátní index v databázi; tahle kontrola je tu
     * kvůli srozumitelné hlášce u pole. Spoléhat jen na ni by ale byla chyba:
     * mezi kontrolou a zápisem je mezera, do které se druhý požadavek vejde.
     * Proto zůstává index jako skutečná pojistka a `zpracovatChybu` z P2002
     * udělá 409.
     */
    const uzExistuje = await db.pravniDokument.findUnique({
      where: { druh_verze: { druh: vstup.druh, verze: vstup.verze } },
      select: { id: true },
    });

    if (uzExistuje) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        verze: 'Tahle verze už existuje. Uložené znění se nepřepisuje – zvolte nové označení.',
      });
    }

    const dokument = await db.pravniDokument.create({
      data: {
        druh: vstup.druh,
        verze: vstup.verze.trim(),
        nadpis: vstup.nadpis.trim(),
        obsah: vstup.obsah,
        ucinnostOd: vstup.ucinnostOd,
      },
      select: { id: true, verze: true, ucinnostOd: true },
    });

    /*
     * `Settings.verzePodminek` se rovnat nemusí a záměrně se tu nepřepisuje:
     * objednávka si verzi bere z účinného znění (`verzeProObjednavku`), ne
     * z nastavení. Nastavení zůstává jen zálohou pro prázdnou tabulku.
     */
    await zapsatDoAuditu(admin.email, 'pravni-dokument.vlozen', 'PravniDokument', dokument.id, {
      nazev: `${vstup.druh} ${dokument.verze}`,
    });

    return odpovedOk(
      {
        id: dokument.id,
        verze: dokument.verze,
        zprava:
          dokument.ucinnostOd > new Date()
            ? `Znění je uložené a nabude účinnosti ${dokument.ucinnostOd.toLocaleDateString('cs-CZ')}. Do té doby platí předchozí verze.`
            : 'Znění je uložené a od teď platí pro nové objednávky.',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
