import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { profilSchema } from '@/lib/validations/ucet';
import { odhlasitZOdberu, prihlasitKOdberu } from '@/lib/newsletter';
import { klientskaIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Profil přihlášené zákaznice.
 *
 * Do téhle chvíle šla jména a telefon zapsat jedině při registraci nebo
 * z administrace – zákaznice si po překlepu ve jméně nemohla pomoct sama
 * a souhlas s novinkami odvolala jedině smazáním celého účtu.
 */
export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    return odpovedOk({ profil: uzivatel });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** PATCH – úprava jména, telefonu a souhlasu s newsletterem. */
export async function PATCH(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const vstup = profilSchema.parse(await request.json());

    /*
     * --- Newsletter: zapnutí i vypnutí vede přes `lib/newsletter.ts` ---
     *
     * Přepínač dřív jenom přepsal `User.newsletterSouhlas`. Vypnutí se pak
     * ještě promítlo do odběru, ale **zapnutí ne** – zákaznice si novinky
     * zapnula, účet jí to potvrdil a na žádný seznam se nedostala, protože
     * rozesílka čte `NewsletterSubscriber`. Navíc tím vznikal souhlas bez
     * potvrzené adresy a bez jediného záznamu (čl. 7 odst. 1 GDPR).
     *
     * `newsletterSouhlas` na účtu proto **nenastavujeme na `true` rovnou**:
     * zaškrtnutí spustí potvrzovací e-mail a příznak překlopí až kliknutí na
     * odkaz (`/api/newsletter/potvrzeni`). Vypnutí platí okamžitě – odvolání
     * souhlasu nesmí na nic čekat (čl. 7 odst. 3).
     */
    const profil = await db.user.update({
      where: { id: uzivatel.id },
      data: {
        jmeno: vstup.jmeno,
        telefon: vstup.telefon,
        // `undefined` = pole nepřišlo, hodnotu necháváme být.
        // `true` se sem nepropisuje – čeká na potvrzení adresy.
        ...(vstup.newsletterSouhlas === false ? { newsletterSouhlas: false } : {}),
      },
      select: {
        id: true,
        email: true,
        jmeno: true,
        telefon: true,
        role: true,
        newsletterSouhlas: true,
      },
    });

    let zprava = 'Údaje jsme uložili.';

    /*
     * Odvolaný souhlas musí platit i pro odběr vedený mimo účet. Kdyby se
     * zákaznice kdysi přihlásila k novinkám bez registrace, zůstal by ten
     * záznam aktivní a přepínač v účtu by ji uklidnil, aniž by cokoliv změnil.
     */
    if (vstup.newsletterSouhlas === false) {
      await odhlasitZOdberu({
        email: profil.email,
        zdroj: 'ucet',
        ip: klientskaIp(request),
        userAgent: request.headers.get('user-agent'),
      });
    }

    if (vstup.newsletterSouhlas === true) {
      const vysledek = await prihlasitKOdberu({
        email: profil.email,
        zdroj: 'ucet',
        ip: klientskaIp(request),
        userAgent: request.headers.get('user-agent'),
      });

      /*
       * Zákaznice musí vědět, že přepínač ještě není hotová věc – jinak zavře
       * stránku s pocitem, že novinky odebírá, a potvrzovací e-mail nechá
       * ležet. Když už potvrzeno má, nic se neposílalo a zpráva by lhala.
       */
      if (!vysledek.jizPotvrzeno) {
        zprava = `Údaje jsme uložili. ${vysledek.zprava}`;
      }
    }

    return odpovedOk({ profil, zprava });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
