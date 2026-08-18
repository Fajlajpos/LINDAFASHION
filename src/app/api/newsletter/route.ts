import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { FRONTY, publishJob } from '@/lib/queue';
import { zaznamenatSouhlas } from '@/lib/souhlasy';

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

    const { email, zdroj } = schema.parse(await request.json());
    const ip = klientskaIp(request);

    // Opakované přihlášení nesmí skončit chybou o obsazeném e-mailu –
    // pro zákaznici je to tentýž úkon jako poprvé. Zároveň obnoví odběr,
    // který si dřív odhlásila.
    /*
     * IP prvního kroku double opt-inu (čl. 7 odst. 1 GDPR, § 7 zák. č. 480/2004 Sb.).
     *
     * Doložit je potřeba **oba** kroky: že někdo adresu zadal, i že jí patříící
     * člověk klikl na potvrzení. Bez první IP se nedá ukázat, odkud přihláška
     * přišla – a při stížnosti na neVyžádaný e-mail je to první dotaz ÚúOO.
     *
     * `ipPrihlaseni` se přepisuje i při opakovaném přihlášení: platí poslední
     * projev vůle, ne ten původní. Historie zůstává v `SouhlasZaznam`.
     */
    const odberatel = await db.newsletterSubscriber.upsert({
      where: { email },
      update: { odhlasenAt: null, ipPrihlaseni: ip },
      create: { email, zdroj: zdroj ?? null, ipPrihlaseni: ip },
      select: { token: true, potvrzeno: true },
    });

    /*
     * Potvrzovací odkaz posíláme jen tomu, kdo ještě nepotvrdil. Opakované
     * odeslání formuláře už potvrzenou odběratelkou by jinak znamenalo, že
     * kdokoliv, kdo zná cizí adresu, jí umí naklikat e-maily do schránky.
     */
    if (!odberatel.potvrzeno) {
      const zaklad = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'newsletter-potvrzeni',
        to: email,
        subject: 'Potvrďte prosím odběr novinek – LINDA FASHION',
        data: { odkaz: `${zaklad}/newsletter/potvrzeni?token=${encodeURIComponent(odberatel.token)}` },
      });
    }

    /*
     * Do evidence se zapisuje **žádost**, ne souhlas: `udeleno: false`.
     * Souhlas vzniká až kliknutím na potvrzovací odkaz – do té doby je záznam
     * evidencí zájmu. Kdyby se zapisoval jako udělený, vyrobený důkaz by tvrdil
     * pravý opak toho, co double opt-in dokladá.
     */
    await zaznamenatSouhlas({
      typ: 'NEWSLETTER',
      subjekt: email,
      udeleno: false,
      podrobnosti: { krok: 'prihlaseni', zdroj: zdroj ?? null },
      ip,
      userAgent: request.headers.get('user-agent'),
    });

    return odpovedOk({
      zprava: odberatel.potvrzeno
        ? 'Vaši adresu už v odběru novinek máme. Nemusíte dělat nic dalšího.'
        : 'Děkujeme. Poslali jsme vám e-mail s potvrzovacím odkazem – odběr spustíme, jakmile na něj kliknete.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
