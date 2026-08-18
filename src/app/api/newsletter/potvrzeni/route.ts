import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { zaznamenatSouhlas } from '@/lib/souhlasy';

export const dynamic = 'force-dynamic';

/**
 * Dokončení double opt-inu k odběru novinek.
 *
 * Bez tohohle kroku byl `NewsletterSubscriber.potvrzeno` navždy `false`:
 * seznam byl evidencí zájmu, ne souhlasem s rozesílkou. Rozesílat na
 * nepotvrzené adresy nelze – jednak to zakazuje GDPR, jednak stačí, aby
 * někdo do formuláře napsal cizí adresu, a chodily by jí novinky.
 *
 * **Potvrzuje až POST, ne otevření odkazu.** Stejný důvod jako u odhlášení,
 * jen s opačným dopadem: náhledový robot poštovního klienta si odkazy v e-mailu
 * předběžně načte, a kdyby potvrzoval GET, vznikl by „souhlas", na který
 * zákaznice nikdy neklikla. Právě ten souhlas má přitom double opt-in doložit,
 * takže by celé opatření ztratilo smysl.
 *
 * Autorizací je token z e-mailu; `jeStejnyPuvod` se proto nevolá, požadavek
 * přichází z čerstvě otevřené stránky bez vazby na relaci.
 */

const schema = z.object({
  token: z.string().min(10, 'Odkaz je neplatný.').max(200),
});

/** Zakryje adresu na `p***a@seznam.cz` – potvrdí, o čí odběr jde, bez vypsání. */
function zakrytEmail(email: string): string {
  const [jmeno, domena] = email.split('@');
  if (!domena) return '***';

  const viditelne = jmeno.length <= 2 ? jmeno.slice(0, 1) : `${jmeno[0]}***${jmeno[jmeno.length - 1]}`;
  return `${viditelne}@${domena}`;
}

/** GET ?token= – ověření odkazu, aby stránka věděla, co zobrazit. */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
    if (!token) return odpovedOk({ platny: false });

    const limit = zkontrolovatLimit(`newsletter-potvrzeni:${klientskaIp(request)}`, 30, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho požadavků. Zkuste to prosím za chvíli.', 429);
    }

    const odberatel = await db.newsletterSubscriber.findUnique({
      where: { token },
      select: { email: true, potvrzeno: true, odhlasenAt: true },
    });

    if (!odberatel) return odpovedOk({ platny: false });

    return odpovedOk({
      platny: true,
      email: zakrytEmail(odberatel.email),
      jizPotvrzeno: odberatel.potvrzeno && odberatel.odhlasenAt === null,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – vlastní potvrzení odběru. */
export async function POST(request: Request) {
  try {
    const limit = zkontrolovatLimit(`newsletter-potvrzeni:${klientskaIp(request)}`, 30, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho požadavků. Zkuste to prosím za chvíli.', 429);
    }

    const { token } = schema.parse(await request.json());
    const ip = klientskaIp(request);

    /*
     * `updateMany`, ne `update`: dvojklik ani znovunačtení stránky nesmí
     * skončit chybou o nenalezeném záznamu. Bez podmínky na `potvrzeno`,
     * protože potvrzení je idempotentní – druhý průchod jen přepíše totéž.
     *
     * `odhlasenAt: null` současně řeší případ, kdy si zákaznice odběr mezitím
     * odhlásila a pak otevřela starý potvrzovací e-mail: potvrzení odhlášení
     * nezruší.
     */
    /*
     * `potvrzeno: false` v podmínce je nově **podstatné**, ačkoliv dřív tu
     * schválně nebylo: `potvrzenoAt` musí nést okamžik, kdy souhlas skutečně
     * vznikl. Bez té podmínky by každé znovunačtení stránky posunulo datum
     * souhlasu na dnešek – evidence by pak tvrdila, že zákaznice souhlasila
     * dnes, třeba rok poté, co to udělala doopravdy.
     *
     * Opakovaný průchod už proto nic nezmění a řeší ho větev níž.
     */
    const zmeneno = await db.newsletterSubscriber.updateMany({
      where: { token, odhlasenAt: null, potvrzeno: false },
      data: { potvrzeno: true, potvrzenoAt: new Date(), ipPotvrzeni: ip },
    });

    if (zmeneno.count === 0) {
      const existuje = await db.newsletterSubscriber.findUnique({
        where: { token },
        select: { odhlasenAt: true, potvrzeno: true },
      });

      if (!existuje) {
        return odpovedChyba(
          'Tenhle potvrzovací odkaz už neplatí. Přihlaste se prosím k odběru znovu.',
          404
        );
      }

      if (existuje.odhlasenAt !== null) {
        return odpovedChyba(
          'Tuhle adresu evidujeme jako odhlášenou z odběru. Přihlaste se prosím znovu formulářem v patičce.',
          409
        );
      }

      /*
       * Zbývá už jen „odběr byl potvrzený dřív“ – dřív to spadlo do větve
       * o odhlášení a zákaznice dostala chybu za to, že klikla podruhé.
       * Výsledek je přitom přesně ten, který chce.
       */
      return odpovedOk({
        zprava: 'Odběr novinek už potvrzený máte. Nemusíte dělat nic dalšího.',
      });
    }

    /*
     * Do evidence až teď: souhlas vznikl právě tímto kliknutím, ne při vyplnění
     * formuláře. To je celý smysl double opt-inu a evidence to musí odrážet.
     */
    const odberatel = await db.newsletterSubscriber.findUnique({
      where: { token },
      select: { email: true },
    });

    if (odberatel) {
      await zaznamenatSouhlas({
        typ: 'NEWSLETTER',
        subjekt: odberatel.email,
        udeleno: true,
        podrobnosti: { krok: 'potvrzeni-double-opt-in' },
        ip,
        userAgent: request.headers.get('user-agent'),
      });
    }

    return odpovedOk({
      zprava: 'Hotovo, odběr novinek je potvrzený. První zprávu vám pošleme s nejbližší novinkou.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
