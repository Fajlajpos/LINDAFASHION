import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Zadejte prosím e-mail.')
    .email('Zadejte prosím platný e-mail.')
    .max(200)
    .transform((v) => v.trim().toLowerCase()),
  // Jen pro měření, odkud přihlášky chodí. Neznámou hodnotu zahodíme.
  zdroj: z.enum(['hero', 'paticka']).optional(),
});

/**
 * POST /api/newsletter – přihlášení k odběru (sekce 12).
 *
 * Do téhle chvíle formuláře v hero sekci i v patičce jen předstíraly odeslání:
 * potvrdily přijetí a nikam nic nezapsaly.
 *
 * `potvrzeno` zůstává `false` – double opt-in se dokončí, až budou SMTP
 * přístupy a půjde odeslat potvrzovací odkaz. Do té doby je záznam evidencí
 * zájmu, ne souhlasem s rozesílkou.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`newsletter:${klientskaIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím později.', 429);
    }

    const { email, zdroj } = schema.parse(await request.json());

    // Opakované přihlášení nesmí skončit chybou o obsazeném e-mailu –
    // pro zákaznici je to tentýž úkon jako poprvé. Zároveň obnoví odběr,
    // který si dřív odhlásila.
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: { odhlasenAt: null },
      create: { email, zdroj: zdroj ?? null },
    });

    return odpovedOk({
      zprava: 'Děkujeme, přihlášku jsme zaevidovali. Ozveme se s první novinkou.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
