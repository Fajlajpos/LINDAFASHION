import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { potvrzeniEmailuSchema } from '@/lib/validations/ucet';
import { overitTokenZmeny } from '@/lib/zmena-emailu';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ucet/zmena-emailu/potvrzeni – dokončení změny přihlašovacího e-mailu.
 *
 * **Přihlášení se nevyžaduje.** Potvrzuje se z nové schránky, klidně na jiném
 * zařízení nebo v jiném prohlížeči; token je ten důkaz, ne session.
 *
 * **Je to POST, ne GET.** Kdyby změnu dokončilo prosté otevření odkazu,
 * provedl by ji náhledový robot poštovního klienta dřív, než si zákaznice
 * zprávu přečte — stejný důvod, proč je POST i potvrzení newsletteru
 * a odhlášení z něj.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    // Token je náhodných 32 bajtů, hádat ho nemá smysl – limit je proti
    // zahlcení, ne proti uhodnutí.
    const limit = zkontrolovatLimit(`zmena-emailu-potvrzeni:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const { token } = potvrzeniEmailuSchema.parse(await request.json());

    const zmena = await overitTokenZmeny(token);
    if (!zmena) {
      return odpovedChyba(
        'Odkaz je neplatný nebo už vypršel. Požádejte o změnu e-mailu znovu ve svém účtu.',
        410
      );
    }

    /*
     * Obsazenost se kontroluje **znovu**. Mezi žádostí a potvrzením může
     * uplynout den a adresu si mezitím mohl zaregistrovat někdo jiný; bez
     * téhle kontroly by zápis spadl na unikátním indexu a zákaznice by
     * dostala hlášku o chybě serveru místo vysvětlení.
     */
    const obsazeny = await db.user.findUnique({
      where: { email: zmena.novyEmail },
      select: { id: true },
    });

    if (obsazeny) {
      return odpovedChyba(
        'Tuhle adresu mezitím zabral jiný účet. Zvolte prosím ve svém účtu jinou.',
        409
      );
    }

    /*
     * Značka „použito" se nastavuje **podmíněně** (`pouzitoAt: null` ve `where`)
     * a kontroluje se počet. Dvojklik na odkaz nebo souběžné otevření ve dvou
     * záložkách by jinak proběhlo dvakrát; podruhé už by ale token nesměl
     * platit. Stejná úvaha jako u storna objednávky.
     */
    const oznaceno = await db.zmenaEmailu.updateMany({
      where: { id: zmena.id, pouzitoAt: null },
      data: { pouzitoAt: new Date() },
    });

    if (oznaceno.count !== 1) {
      return odpovedChyba('Tenhle odkaz už byl použitý.', 410);
    }

    /*
     * Zápis e-mailu a zneplatnění relací jedním dotazem.
     *
     * `tokenVerze` se zvyšuje schválně: mění se přihlašovací jméno, takže
     * všechna dosud vydaná přihlášení musí padnout. Kdyby účet někdo převzal
     * a majitelka změnu potvrdila ze své schránky, tímhle mu relaci utne.
     *
     * `newsletterSouhlas` padá na `false`, protože souhlas se váže k adrese,
     * ne k účtu — a k té nové žádný potvrzený nemáme. Řádky
     * v `NewsletterSubscriber` se **nemažou ani nepřepisují**: jsou to důkazy
     * o souhlasu u původní adresy (čl. 7 odst. 1) a přepsat je na novou by
     * znamenalo vyrobit souhlas, který nikdo nedal.
     */
    await db.user.update({
      where: { id: zmena.userId },
      data: {
        email: zmena.novyEmail,
        tokenVerze: { increment: 1 },
        newsletterSouhlas: false,
      },
    });

    return odpovedOk({
      email: zmena.novyEmail,
      zprava:
        'E-mail jsme změnili. Z bezpečnostních důvodů jsme vás odhlásili na všech zařízeních – ' +
        'přihlaste se prosím znovu novou adresou.',
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
