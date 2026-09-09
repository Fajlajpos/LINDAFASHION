import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { verifyPassword } from '@/lib/hesla';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { zmenaEmailuSchema } from '@/lib/validations/ucet';
import { PLATNOST_HODIN, zalozitZmenuEmailu } from '@/lib/zmena-emailu';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ucet/zmena-emailu – žádost o změnu přihlašovacího e-mailu.
 *
 * Čl. 16 GDPR dává právo na opravu nepřesných údajů. E-mail se do téhle
 * chvíle opravit nedal vůbec – `profilSchema` ho neobsahuje, protože je to
 * zároveň přihlašovací jméno – takže jedinou cestou k nápravě překlepu bylo
 * smazat účet. To je na právo na opravu odpověď „ne".
 *
 * Změna se tady **neprovede**, jen se založí žádost a odešle potvrzovací
 * odkaz na novou adresu. Teprve její potvrzení účet přepíše.
 *
 * Na starou adresu jde zároveň upozornění. Je to poslední pojistka: kdyby se
 * někdo k účtu dostal a zkusil ho přesměrovat na sebe, majitelka se to dozví
 * do schránky, ke které pořád má přístup.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    // Brzda na hádání stávajícího hesla u odemčeného prohlížeče – stejná
    // úvaha jako u změny hesla.
    const limit = zkontrolovatLimit(`zmena-emailu:${uzivatel.id}`, 5, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za hodinu.', 429);
    }

    const vstup = zmenaEmailuSchema.parse(await request.json());

    const ucet = await db.user.findUnique({
      where: { id: uzivatel.id },
      select: { id: true, email: true, jmeno: true, passwordHash: true },
    });

    if (!ucet || !(await verifyPassword(vstup.heslo, ucet.passwordHash))) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 401, {
        heslo: 'Stávající heslo nesouhlasí.',
      });
    }

    if (vstup.novyEmail === ucet.email.toLowerCase()) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        novyEmail: 'Tuhle adresu už na účtu máte.',
      });
    }

    /*
     * Obsazenost hlásíme naplno. Jinde by to byl únik informace o tom, které
     * účty existují – tady ne: ptá se přihlášená zákaznice na adresu, kterou
     * si sama vybrala, a bez téhle hlášky by jí potvrzení tiše selhalo až
     * v druhém kroku. Registrace to řeší stejně.
     */
    const obsazeny = await db.user.findUnique({
      where: { email: vstup.novyEmail },
      select: { id: true },
    });

    if (obsazeny) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 409, {
        novyEmail: 'Na tento e-mail už účet existuje.',
      });
    }

    const token = await zalozitZmenuEmailu(ucet.id, vstup.novyEmail);
    const zaklad = process.env.APP_URL || 'http://localhost:3000';
    const odkaz = `${zaklad}/zmena-emailu?t=${encodeURIComponent(token)}`;

    // Potvrzení na **novou** adresu – tím se prokáže, že k ní má přístup.
    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'zmena-emailu-potvrzeni',
      to: vstup.novyEmail,
      subject: 'Potvrďte novou e-mailovou adresu – LINDA FASHION',
      data: { odkaz, jmeno: ucet.jmeno, puvodniEmail: ucet.email, platnostHodin: PLATNOST_HODIN },
    });

    // Upozornění na **starou** adresu – ať se o pokusu dozví i tehdy, když
    // ho nevyvolala ona.
    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'zmena-emailu-upozorneni',
      to: ucet.email,
      subject: 'Někdo požádal o změnu e-mailu u vašeho účtu – LINDA FASHION',
      data: { novyEmail: vstup.novyEmail, jmeno: ucet.jmeno },
    });

    return odpovedOk({
      zprava:
        `Na adresu ${vstup.novyEmail} jsme poslali potvrzovací odkaz. ` +
        `Účet přepíšeme, teprve až na něj kliknete – odkaz platí ${PLATNOST_HODIN} hodin. ` +
        'Do té doby se přihlašujete původní adresou.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
