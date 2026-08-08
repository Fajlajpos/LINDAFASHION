import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { reklamaceSchema } from '@/lib/validations/ucet';
import { nacistNastaveni } from '@/lib/nastaveni';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

/**
 * Reklamace a vrácení zboží ze strany zákaznice (sekce 6.10).
 *
 * Do téhle chvíle uměla reklamaci založit **jen administrace**. Zákaznice
 * neměla jak vrácení uplatnit jinak než e-mailem, přestože na odstoupení od
 * smlouvy do 14 dnů má ze zákona nárok – a e-shop jí k tomu má dát nástroj.
 *
 * Endpoint jen **eviduje**; posoudí ji majitelka v administraci. Sklad ani
 * peníze se tady nehýbou, to dělá až uznání (`/api/admin/reklamace/[id]`).
 */

/** Stavy, ve kterých zboží ještě není u zákaznice – není co reklamovat ani vracet. */
const PRED_DORUCENIM = ['NOVA', 'ZPRACOVAVA_SE'] as const;

/** Stavy, ve kterých už objednávka neplatí. */
const UZAVRENE = ['ZRUSENA', 'VRACENA'] as const;

/** Brzda proti opakovanému odeslání formuláře. */
const MAX_ZADOSTI = 10;
const OKNO_MS = 60 * 60 * 1000;

/** GET – přehled vlastních reklamací pro `/muj-ucet`. */
export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const reklamace = await db.reklamace.findMany({
      where: { order: { userId: uzivatel.id } },
      orderBy: { datumPrijeti: 'desc' },
      take: 100,
      include: {
        order: { select: { cisloObjednavky: true } },
        orderItem: {
          include: { variant: { include: { product: { select: { nazev: true } } } } },
        },
      },
    });

    return odpovedOk({
      reklamace: reklamace.map((r) => ({
        id: r.id,
        typ: r.typ,
        stav: r.stav,
        duvod: r.duvod,
        // `poznamkaAdmina` je vyjádření k žádosti – zákaznice ho vidět má.
        poznamkaAdmina: r.poznamkaAdmina,
        datumPrijeti: r.datumPrijeti,
        datumVyrizeni: r.datumVyrizeni,
        cisloObjednavky: r.order.cisloObjednavky,
        polozka: r.orderItem
          ? `${r.orderItem.variant.product.nazev} (${r.orderItem.variant.velikost})`
          : null,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** POST – podání reklamace nebo vrácení. */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const limit = zkontrolovatLimit(`reklamace:${klientskaIp(request)}`, MAX_ZADOSTI, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho žádostí. Zkuste to prosím později.', 429);
    }

    const vstup = reklamaceSchema.parse(await request.json());

    /*
     * Objednávka se hledá rovnou s `userId` v podmínce. Cizí objednávku tak
     * nejde ani načíst – odpověď je stejná jako pro neexistující, takže se
     * z ní nedá vyčíst, že existuje.
     */
    const objednavka = await db.order.findFirst({
      where: { id: vstup.orderId, userId: uzivatel.id },
      select: { id: true, cisloObjednavky: true, stav: true },
    });

    if (!objednavka) return odpovedChyba('Objednávka nebyla nalezena.', 404);

    if ((UZAVRENE as readonly string[]).includes(objednavka.stav)) {
      return odpovedChyba(
        'K téhle objednávce už žádost podat nejde – je zrušená nebo vrácená. Napište nám prosím a domluvíme se.',
        409
      );
    }

    if ((PRED_DORUCENIM as readonly string[]).includes(objednavka.stav)) {
      return odpovedChyba(
        vstup.typ === 'VRACENI'
          ? 'Objednávka k vám ještě nedorazila. Dokud je ve zpracování, můžete ji rovnou zrušit.'
          : 'Objednávka k vám ještě nedorazila, takže není co reklamovat. Ozvěte se nám prosím.',
        409
      );
    }

    // Položka musí patřit k téhle objednávce, jinak by uznané vrácení zvýšilo
    // sklad o zboží z docela jiného nákupu.
    if (vstup.orderItemId) {
      const polozka = await db.orderItem.findFirst({
        where: { id: vstup.orderItemId, orderId: objednavka.id },
        select: { id: true },
      });

      if (!polozka) {
        return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
          orderItemId: 'Tato položka k vybrané objednávce nepatří.',
        });
      }
    }

    /*
     * Rozpracovaná žádost na totéž se nezakládá znovu. Bez toho by opakované
     * odeslání formuláře (nebo netrpělivé klikání) vyrobilo několik stejných
     * záznamů a majitelka by je musela ručně rozplétat.
     */
    const jizPodano = await db.reklamace.findFirst({
      where: {
        orderId: objednavka.id,
        orderItemId: vstup.orderItemId || null,
        typ: vstup.typ,
        stav: { in: ['PRIJATA', 'RESI_SE'] },
      },
      select: { id: true },
    });

    if (jizPodano) {
      return odpovedChyba(
        'Tuhle žádost už evidujeme a pracujeme na ní. Její stav najdete níž v přehledu.',
        409
      );
    }

    const reklamace = await db.reklamace.create({
      data: {
        orderId: objednavka.id,
        orderItemId: vstup.orderItemId || null,
        typ: vstup.typ,
        duvod: vstup.duvod,
      },
      select: { id: true },
    });

    // Notifikace majitelce. Bez SMTP skončí v logu workeru – žádost samotná
    // je bezpečně v databázi a čeká v administraci.
    const nastaveni = await nacistNastaveni();
    if (nastaveni.emailFirmy) {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'nova-reklamace',
        to: nastaveni.emailFirmy,
        subject: `${vstup.typ === 'VRACENI' ? 'Vrácení' : 'Reklamace'} k objednávce ${objednavka.cisloObjednavky}`,
        data: {
          reklamaceId: reklamace.id,
          cisloObjednavky: objednavka.cisloObjednavky,
          typ: vstup.typ,
        },
      });
    }

    return odpovedOk(
      {
        id: reklamace.id,
        zprava:
          vstup.typ === 'VRACENI'
            ? 'Žádost o vrácení jsme přijali. Ozveme se vám s pokyny, kam zboží poslat.'
            : 'Reklamaci jsme přijali. Ozveme se vám, jakmile ji posoudíme.',
      },
      201
    );
  } catch (err) {
    return zpracovatChybu(err);
  }
}
