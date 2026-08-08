import { z } from 'zod';
import { db } from '@/lib/db';
import { odhlasit, overitUzivatele } from '@/lib/auth';
import { verifyPassword } from '@/lib/hesla';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';

const schema = z.object({
  // Heslo požadujeme i u přihlášené zákaznice – smazání účtu je nevratné
  // a nesmí ho spustit někdo, kdo se dostal k odemčenému prohlížeči.
  heslo: z.string().min(1, 'Pro potvrzení zadejte prosím své heslo.'),
});

/**
 * POST /api/ucet/smazat – smazání účtu podle GDPR (sekce 5 zadání).
 *
 * Účet se NEMAŽE fyzicky. Objednávky a faktury jsou účetní doklady, které
 * zákon nařizuje uchovávat několik let – jejich smazáním by se porušil.
 * Místo toho se anonymizují osobní údaje a objednávky zůstanou bez vazby
 * na konkrétní osobu.
 *
 * Košík a oblíbené žádný důvod k uchování nemají, ty se mažou úplně.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const { heslo } = schema.parse(await request.json());

    const ucet = await db.user.findUnique({
      where: { id: uzivatel.id },
      select: { id: true, passwordHash: true, role: true },
    });

    if (!ucet || !(await verifyPassword(heslo, ucet.passwordHash))) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 401, {
        heslo: 'Heslo nesouhlasí.',
      });
    }

    // Poslední administrátorka nesmí zmizet – jinak by se do administrace
    // nedalo dostat a e-shop by zůstal bez správce.
    if (ucet.role === 'ADMIN') {
      const dalsiAdmin = await db.user.count({
        where: { role: 'ADMIN', anonymizovanoAt: null, NOT: { id: ucet.id } },
      });

      if (dalsiAdmin === 0) {
        return odpovedChyba(
          'Tohle je jediný administrátorský účet. Nejdřív vytvořte jiný, jinak by se do administrace nikdo nedostal.',
          409
        );
      }
    }

    // Unikátní zástupná adresa – `email` má v databázi unikátní index,
    // takže nemůže zůstat prázdný ani se opakovat.
    const nahradniEmail = `smazano-${ucet.id}@anonymizovano.invalid`;

    await db.$transaction([
      // Bez zákonného důvodu k uchování → pryč úplně.
      db.cartItem.deleteMany({ where: { cart: { userId: ucet.id } } }),
      db.cart.deleteMany({ where: { userId: ucet.id } }),
      db.favorite.deleteMany({ where: { userId: ucet.id } }),
      db.address.deleteMany({ where: { userId: ucet.id } }),
      db.passwordReset.deleteMany({ where: { userId: ucet.id } }),

      /*
       * Osobní údaje na účtu se přepíšou. Objednávky zůstávají – nesou vlastní
       * snímek doručovací adresy (sekce 7), takže účetně jsou dál v pořádku,
       * ale odkaz na žijící osobu už z účtu nevede.
       *
       * `tokenVerze` se zvyšuje **tady**, ne až po transakci. Dřív to byl
       * samostatný dotaz za ní: kdyby proces mezi tím spadl, byl by účet
       * anonymizovaný, ale dosud vydané přihlášení by platilo dál. To je
       * přesně ten stav, kvůli kterému `tokenVerze` existuje.
       */
      db.user.update({
        where: { id: ucet.id },
        data: {
          email: nahradniEmail,
          jmeno: null,
          telefon: null,
          newsletterSouhlas: false,
          anonymizovanoAt: new Date(),
          // Náhodný hash: do účtu se nedá přihlásit ani znát původní heslo.
          passwordHash: `anonymizovano-${crypto.randomUUID()}`,
          tokenVerze: { increment: 1 },
        },
      }),

      // Odběr newsletteru vedený mimo účet.
      db.newsletterSubscriber.deleteMany({ where: { email: uzivatel.email } }),

      /*
       * Hlídání dostupnosti a zprávy z kontaktního formuláře se klíčují
       * e-mailem, ne `userId` – anonymizace účtu je proto míjela a adresa
       * zákaznice v databázi zůstávala. Ani jedno není účetní doklad, takže
       * na jejich uchování není po žádosti o výmaz žádný právní důvod.
       */
      db.stockNotification.deleteMany({ where: { email: uzivatel.email } }),
      db.contactMessage.deleteMany({ where: { email: uzivatel.email } }),
    ]);

    odhlasit();

    return odpovedOk({
      zprava:
        'Váš účet byl smazán a osobní údaje anonymizovány. Smazali jsme i hlídané velikosti, ' +
        'odběr novinek a vaše zprávy z kontaktního formuláře. Dokončené objednávky musíme podle ' +
        'zákona uchovat jako účetní doklad, ale už nejsou spojené s vaší osobou.',
      presmerovat: '/',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
