import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { nacistNastaveni } from '@/lib/nastaveni';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

const schema = z.object({
  jmeno: z.string().min(2, 'Zadejte prosím jméno.').max(120).transform((v) => v.trim()),
  email: z
    .string()
    .min(1, 'Zadejte prosím e-mail.')
    .email('Zadejte prosím platný e-mail.')
    .max(200)
    .transform((v) => v.trim().toLowerCase()),
  predmet: z.string().max(200).optional().transform((v) => v?.trim() || undefined),
  zprava: z.string().min(10, 'Napište prosím alespoň pár vět.').max(5000).transform((v) => v.trim()),
});

/**
 * POST /api/kontakt – zpráva z kontaktního formuláře (sekce 12).
 *
 * Zpráva se **ukládá do databáze** a teprve pak se zařadí e-mail majitelce.
 * Kdyby se jen odesílala, každá zpráva by se do zapojení SMTP nenávratně
 * ztratila – formulář přitom zákaznici tvrdil, že dorazila.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`kontakt:${klientskaIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho zpráv. Zkuste to prosím za hodinu.', 429);
    }

    const vstup = schema.parse(await request.json());

    const zprava = await db.contactMessage.create({
      data: {
        jmeno: vstup.jmeno,
        email: vstup.email,
        predmet: vstup.predmet ?? null,
        zprava: vstup.zprava,
      },
      select: { id: true },
    });

    // Notifikace majitelce. Bez SMTP skončí v logu workeru – zpráva samotná
    // je ale bezpečně v databázi a čeká v administraci.
    const nastaveni = await nacistNastaveni();
    if (nastaveni.emailFirmy) {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'nova-zprava-z-formulare',
        to: nastaveni.emailFirmy,
        subject: `Nová zpráva z webu od ${vstup.jmeno}`,
        data: { zpravaId: zprava.id, od: vstup.email, predmet: vstup.predmet ?? null },
      });
    }

    return odpovedOk({
      zprava: 'Děkujeme, zprávu jsme přijali. Ozveme se co nejdřív.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
