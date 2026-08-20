import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedOk, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * Podklad k souhlasům jedné osoby — čl. 7 odst. 1 GDPR.
 *
 * „Správce musí být schopen **doložit**, že subjekt údajů udělil souhlas."
 * Doložit ho ale nejde tím, že data někde jsou; jde to tím, že se dají
 * vytáhnout a vytisknout, dokud běží lhůta od ÚOOÚ.
 *
 * Skládá se ze tří zdrojů, protože souhlas se u nás zaznamenává na třech
 * místech a každé odpovídá na jinou otázku:
 *
 *   • `SouhlasZaznam`        — co bylo zaškrtnuto a kdy, včetně odvolání
 *   • `NewsletterSubscriber` — double opt-in: přihlášení i potvrzení, obojí s IP
 *   • `Order`                — souhlas s obchodními podmínkami a jejich verze
 *
 * Cookies se hledají zvlášť podle náhodného id návštěvnice, ne podle e-mailu.
 * Ta dvě se **schválně nespojují**: id je náhodné právě proto, aby nešlo
 * navázat na osobu, a spojit je jen kvůli výpisu by vyrobilo přesně to
 * sledování, které má souhlas teprve povolit.
 */

const dotazSchema = z.object({
  email: z.string().min(3, 'Zadejte e-mail.').max(200),
});

export async function GET(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    const url = new URL(request.url);
    const vstup = dotazSchema.parse({ email: url.searchParams.get('email') ?? '' });

    // Zákaznice ho do formuláře napíše, jak ji napadne, ne jak ho máme uložený.
    const email = vstup.email.trim().toLowerCase();

    const [zaznamy, newsletter, objednavky] = await Promise.all([
      db.souhlasZaznam.findMany({
        where: { subjekt: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          typ: true,
          udeleno: true,
          verze: true,
          podrobnosti: true,
          ip: true,
          createdAt: true,
        },
      }),

      db.newsletterSubscriber.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: {
          potvrzeno: true,
          createdAt: true,
          potvrzenoAt: true,
          odhlasenAt: true,
          ipPrihlaseni: true,
          ipPotvrzeni: true,
          zdroj: true,
        },
      }),

      db.order.findMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          souhlasPodminkyAt: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          cisloObjednavky: true,
          souhlasPodminkyAt: true,
          verzePodminek: true,
          ipObjednavky: true,
          createdAt: true,
        },
      }),
    ]);

    return odpovedOk({
      email,
      /*
       * Prázdný výsledek není chyba a nesmí se tvářit jako chyba: „o téhle
       * adrese nic nevedeme" je platná a často správná odpověď úřadu.
       */
      nalezeno: zaznamy.length > 0 || newsletter !== null || objednavky.length > 0,
      zaznamy,
      newsletter,
      objednavky,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
