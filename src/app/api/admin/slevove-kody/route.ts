import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const datum = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'Neplatné datum.' });

const schema = z
  .object({
    kod: z
      .string()
      .max(60)
      .optional()
      .nullable()
      .transform((v) => (v?.trim() ? v.trim().toUpperCase().replace(/\s+/g, '') : null)),
    procentoSlevy: z.coerce
      .number()
      .int('Sleva musí být celé číslo.')
      .min(1, 'Sleva musí být aspoň 1 %.')
      .max(100, 'Sleva nemůže přesáhnout 100 %.'),
    platnyOd: datum,
    platnyDo: datum,
    limitPouziti: z
      .union([z.coerce.number().int().min(1).max(100000), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' || v == null ? null : Number(v))),
    aktivni: z.boolean().optional().default(true),
  })
  .refine((d) => !d.platnyOd || !d.platnyDo || d.platnyOd <= d.platnyDo, {
    message: 'Konec platnosti nemůže být dřív než začátek.',
    path: ['platnyDo'],
  });

/** Bez matoucích znaků – kód lidé opisují z papíru (0/O, 1/I). */
const ZNAKY = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function vygenerovatKod(delka = 8): string {
  const bajty = crypto.randomBytes(delka);
  return Array.from(bajty, (b) => ZNAKY[b % ZNAKY.length]).join('');
}

export async function GET() {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const kody = await db.discountCode.findMany({
      orderBy: { id: 'desc' },
      // Kódy se přidávají a nikdy nemažou, takže bez limitu by odpověď rostla
      // navždy. Nejnovější jsou první, ty staré nikoho nezajímají.
      take: 200,
      include: { _count: { select: { orders: true } } },
    });

    return odpovedOk({
      kody: kody.map((k) => ({
        id: k.id,
        kod: k.kod,
        procentoSlevy: k.procentoSlevy,
        platnyOd: k.platnyOd,
        platnyDo: k.platnyDo,
        limitPouziti: k.limitPouziti,
        pocetPouziti: k.pocetPouziti,
        aktivni: k.aktivni,
        pocetObjednavek: k._count.orders,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    // Admin může kód zadat, nebo si ho nechat vygenerovat (sekce 6.6).
    let kod = vstup.kod ?? vygenerovatKod();

    if (vstup.kod) {
      const obsazeny = await db.discountCode.findUnique({ where: { kod }, select: { id: true } });
      if (obsazeny) {
        return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 409, {
          kod: 'Tento kód už existuje.',
        });
      }
    } else {
      // U vygenerovaného kódu zkusíme znovu, kdyby náhodou padla shoda.
      for (let i = 0; i < 5; i++) {
        const obsazeny = await db.discountCode.findUnique({ where: { kod }, select: { id: true } });
        if (!obsazeny) break;
        kod = vygenerovatKod();
      }
    }

    const vytvoreny = await db.discountCode.create({
      data: {
        kod,
        procentoSlevy: vstup.procentoSlevy,
        platnyOd: vstup.platnyOd,
        platnyDo: vstup.platnyDo,
        limitPouziti: vstup.limitPouziti,
        aktivni: vstup.aktivni ?? true,
      },
    });

    await zapsatDoAuditu(admin.email, 'slevovy-kod.vytvoren', 'DiscountCode', vytvoreny.id, {
      nazev: vytvoreny.kod,
      procentoSlevy: vytvoreny.procentoSlevy,
    });

    return odpovedOk({ kod: vytvoreny }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}
