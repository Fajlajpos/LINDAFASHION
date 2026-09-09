import { db } from '@/lib/db';
import { hashPassword, prihlasit } from '@/lib/auth';
import { registraceSchema } from '@/lib/validations/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { prihlasitKOdberu } from '@/lib/newsletter';
import { overitCaptchu } from '@/lib/captcha';

/** Sekce 10: 5 registrací za hodinu z jedné IP – brzda na spam boty. */
const MAX_REGISTRACI = 5;
const OKNO_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) {
      return odpovedChyba('Neplatný požadavek.', 403);
    }

    const limit = zkontrolovatLimit(`registrace:${klientskaIp(request)}`, MAX_REGISTRACI, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho registrací z této adresy. Zkuste to prosím později.', 429);
    }

    const vstup = registraceSchema.parse(await request.json());

    /* Limit podle IP zdrží člověka, ne botnet – captcha je druhá vrstva.
       Bez klíčů v `.env` ověření propouští, takže registrace funguje i teď. */
    const overeni = await overitCaptchu(vstup.captcha, klientskaIp(request));
    if (!overeni.ok) {
      return odpovedChyba(overeni.zprava ?? 'Ověření se nezdařilo.', 400, {
        captcha: overeni.zprava ?? '',
      });
    }

    const obsazeny = await db.user.findUnique({
      where: { email: vstup.email },
      select: { id: true },
    });

    if (obsazeny) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 409, {
        email: 'Na tento e-mail už účet existuje. Zkuste se přihlásit.',
      });
    }

    const user = await db.user.create({
      data: {
        email: vstup.email,
        passwordHash: await hashPassword(vstup.heslo),
        jmeno: vstup.jmeno?.trim() || null,
        telefon: vstup.telefon?.trim() || null,
        /*
         * Zaškrtnutí je zatím jen **projev zájmu**, ne souhlas – ten vzniká až
         * potvrzením adresy o pár řádků níž. Kdyby tu stálo `true` rovnou,
         * tvrdil by účet, že zákaznice novinky odebírá, zatímco na žádném
         * seznamu by nebyla.
         */
        newsletterSouhlas: false,
      },
      select: { id: true, email: true, jmeno: true, role: true, tokenVerze: true },
    });

    /*
     * --- Souhlas s newsletterem jde stejnou cestou jako z veřejného formuláře ---
     *
     * Dřív tu stálo `newsletterSubscriber.deleteMany({ email })` s odůvodněním,
     * že se souhlas nemá držet na dvou místech. Jenže tím se mazal **doklad
     * o dřívějším double opt-inu**: `potvrzenoAt`, `ipPrihlaseni`, `ipPotvrzeni`.
     * Přesně to, co čl. 7 odst. 1 GDPR po správci chce a co retence schválně
     * nemaže. Registrace tak uměla tichým vedlejším účinkem zlikvidovat důkaz,
     * který se ničím nedá nahradit.
     *
     * A druhá polovina téhož: zaškrtnutí vyrábělo `newsletterSouhlas = true`
     * bez potvrzení adresy a bez záznamu. Souhlas bez důkazu, ke kterému se
     * navíc nikdy nic nerozeslalo, protože rozesílka čte `NewsletterSubscriber`.
     *
     * Teď se registrace chová jako formulář v patičce – odešle potvrzovací
     * e-mail a čeká na kliknutí.
     */
    if (vstup.newsletterSouhlas) {
      await prihlasitKOdberu({
        email: vstup.email,
        zdroj: 'registrace',
        ip: klientskaIp(request),
        userAgent: request.headers.get('user-agent'),
      });
    }

    await prihlasit(user);

    const { tokenVerze: _tv, ...verejne } = user;

    return odpovedOk(
      {
        uzivatel: verejne,
        presmerovat: '/muj-ucet',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
