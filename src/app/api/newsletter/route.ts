import { z } from 'zod';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { prihlasitKOdberu } from '@/lib/newsletter';
import { overitCaptchu } from '@/lib/captcha';

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
  captcha: z.string().max(4000).optional().nullable(),
});

/**
 * POST /api/newsletter – přihlášení k odběru (sekce 12).
 *
 * Do téhle chvíle formuláře v hero sekci i v patičce jen předstíraly odeslání:
 * potvrdily přijetí a nikam nic nezapsaly.
 *
 * `potvrzeno` zůstává `false`; překlopí ho až kliknutí na odkaz v potvrzovacím
 * e-mailu (`/api/newsletter/potvrzeni`). Do té doby je záznam evidencí zájmu,
 * ne souhlasem s rozesílkou – rozesílat se smí výhradně na potvrzené adresy.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`newsletter:${klientskaIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím později.', 429);
    }

    const { email, zdroj, captcha } = schema.parse(await request.json());

    /*
     * Druhá vrstva po limitu podle IP. Přihlašovací formulář bere libovolnou
     * adresu bez jakéhokoli předchozího tajemství, takže je to typický cíl
     * pro roboty – na rozdíl od reklamace nebo odstoupení, kam se bez tokenu
     * objednávky (nebo čísla a e-mailu) nikdo nedostane.
     *
     * Bez klíčů v `.env` ověření propouští, takže formulář funguje i teď.
     */
    const overeni = await overitCaptchu(captcha, klientskaIp(request));
    if (!overeni.ok) {
      return odpovedChyba(overeni.zprava ?? 'Ověření se nezdařilo.', 400, {
        captcha: overeni.zprava ?? '',
      });
    }

    /*
     * Vlastní práci dělá `prihlasitKOdberu` – tentýž kód používá i registrace
     * a přepínač v účtu. Dřív měl každý z těch tří vstupů vlastní chování
     * a dva z nich vyráběly souhlas bez double opt-inu a bez jediného důkazu.
     */
    const vysledek = await prihlasitKOdberu({
      email,
      zdroj,
      ip: klientskaIp(request),
      userAgent: request.headers.get('user-agent'),
    });

    return odpovedOk({ zprava: vysledek.zprava });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
