import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { objednavkaSchema } from '@/lib/validations/objednavka';
import { vytvoritObjednavku } from '@/lib/objednavka';
import { FRONTY, publishJob } from '@/lib/queue';
import { NAZEV_DOPRAVY, NAZEV_PLATBY } from '@/lib/objednavka-popisky';
import { zalozitPlatbu } from '@/lib/gopay';
import { czkNaHalere } from '@/lib/penize';

export const dynamic = 'force-dynamic';

/** Brzda proti opakovanému odeslání a proti zahlcení skladu falešnými objednávkami. */
const MAX_OBJEDNAVEK = 10;
const OKNO_MS = 15 * 60 * 1000;

/**
 * POST /api/objednavky – dokončení nákupu.
 *
 * Funguje i bez registrace (guest checkout, sekce 14). Přihlášené zákaznici
 * se objednávka připojí k účtu a vyprázdní se jí košík.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const limit = zkontrolovatLimit(`objednavka:${klientskaIp(request)}`, MAX_OBJEDNAVEK, OKNO_MS);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů o objednávku. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = objednavkaSchema.parse(await request.json());

    // Ověření proti databázi, ne jen platný token: objednávka se připojuje
    // k účtu, takže se nesmí zavěsit na účet, který mezitím zmizel nebo byl
    // odhlášen ze všech zařízení.
    const uzivatel = await overitUzivatele();

    /*
     * IP se předává ze serveru, ne z těla požadavku – je to důkaz o uzavření
     * smlouvy na dálku a prohlížeč si ho určovat nesmí.
     */
    const vysledek = await vytvoritObjednavku(vstup, uzivatel?.id ?? null, {
      ip: klientskaIp(request),
    });

    if (!vysledek.ok) {
      return odpovedChyba(vysledek.chyba.zprava, vysledek.chyba.status, vysledek.chyba.pole);
    }

    // Doklad i potvrzovací e-mail vyřídí worker – zákaznice nemá čekat,
    // až se vygeneruje PDF (sekce 3).
    //
    // Tenhle doklad je podklad k platbě: u bankovního převodu ještě nikdo
    // nezaplatil. Jakmile admin objednávku označí jako zaplacenou, worker
    // stejný soubor přepíše (viz `api/admin/objednavky/[id]`).
    await publishJob(FRONTY.VYGENEROVAT_FAKTURU, { orderId: vysledek.data.id });
    await publishJob(FRONTY.VYGENEROVAT_POUKAZY, { orderId: vysledek.data.id });
    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'potvrzeni-objednavky',
      to: vstup.email,
      subject: `Potvrzení objednávky ${vysledek.data.cisloObjednavky} – LINDA FASHION`,
      data: {
        orderId: vysledek.data.id,
        cisloObjednavky: vysledek.data.cisloObjednavky,
        // Odkaz na potvrzení musí fungovat i bez přihlášení (guest checkout),
        // takže do zprávy patří veřejný token, ne číslo objednávky.
        verejnyToken: vysledek.data.verejnyToken,
        celkovaCena: vysledek.data.celkovaCenaKc,
        zpusobPlatby: NAZEV_PLATBY[vysledek.data.zpusobPlatby] ?? vysledek.data.zpusobPlatby,
        zpusobDopravy: NAZEV_DOPRAVY[vstup.zpusobDopravy] ?? vstup.zpusobDopravy,
      },
    });

    /*
     * Platba kartou: objednávka je založená, teď se k ní připojí platba
     * u brány a zákaznice se přesměruje na `platebniUrl`.
     *
     * Zakládá se **až po** zápisu objednávky, ne před ním. Kdyby to bylo
     * naopak a zápis pak selhal (vykoupený poslední kus), zůstala by u GoPay
     * viset platba bez objednávky – a zákaznice by mohla zaplatit za nic.
     *
     * Selhání brány objednávku neruší. Zboží je odečtené, doklad vzniká
     * a zákaznice zaplatí převodem podle údajů na potvrzení; zrušit
     * objednávku kvůli výpadku brány by bylo horší než ji nechat stát.
     */
    let platebniUrl: string | null = null;

    if (vysledek.data.zpusobPlatby === 'gopay' && vysledek.data.kUhradeKc > 0) {
      try {
        const zaklad = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

        const platba = await zalozitPlatbu({
          cisloObjednavky: vysledek.data.cisloObjednavky,
          castka: czkNaHalere(vysledek.data.kUhradeKc),
          email: vstup.email,
          jmeno: vstup.dodaciJmenoPrijmeni,
          telefon: vstup.dodaciTelefon,
          navratovaUrl: `${zaklad}/api/platba/gopay/navrat?t=${encodeURIComponent(vysledek.data.verejnyToken)}`,
          notifikacniUrl: `${zaklad}/api/platba/gopay/notifikace`,
        });

        await db.order.update({
          where: { id: vysledek.data.id },
          data: { platbaId: platba.id },
        });

        platebniUrl = platba.gwUrl;
      } catch (err) {
        console.error('[gopay] Platbu se nepodařilo založit:', err);
      }
    }

    return odpovedOk({ ...vysledek.data, platebniUrl }, 201);
  } catch (err) {
    return zpracovatChybu(err);
  }
}

/** GET – objednávky přihlášené zákaznice (pro `/muj-ucet`). */
export async function GET() {
  try {
    const uzivatel = await overitUzivatele();
    if (!uzivatel) return odpovedChyba('Nejste přihlášeni.', 401);

    const objednavky = await db.order.findMany({
      where: { userId: uzivatel.id },
      orderBy: { createdAt: 'desc' },
      // Účet vypisuje historii nákupů; sto posledních pokryje i věrnou
      // zákaznici a odpověď nemůže růst donekonečna.
      take: 100,
      include: {
        items: {
          include: {
            variant: { include: { product: { select: { nazev: true, slug: true } } } },
          },
        },
      },
    });

    return odpovedOk({
      objednavky: objednavky.map((o) => ({
        id: o.id,
        cisloObjednavky: o.cisloObjednavky,
        // Klíč k dokladu v PDF – účet ho potřebuje pro odkaz na `/api/faktura`.
        verejnyToken: o.verejnyToken,
        stav: o.stav,
        stavPlatby: o.stavPlatby,
        celkovaCena: Number(o.celkovaCena),
        zpusobDopravy: o.zpusobDopravy,
        zpusobPlatby: o.zpusobPlatby,
        cisloZasilky: o.cisloZasilky,
        createdAt: o.createdAt,
        // Storno je možné jen dokud objednávka leží ve stavu NOVA (sekce 5).
        lzeStornovat: o.stav === 'NOVA',
        // Reklamovat či vrátit jde, až když zboží odešlo – a dokud objednávka
        // pořád platí. Endpoint si to ověřuje znovu, tohle řídí jen tlačítko.
        lzeReklamovat: o.stav === 'EXPEDOVANA' || o.stav === 'DORUCENA',
        polozky: o.items.map((i) => ({
          // Id položky potřebuje formulář reklamace, aby šlo vrátit jeden kus
          // z objednávky, ne rovnou celou.
          id: i.id,
          nazev: i.variant.product.nazev,
          slug: i.variant.product.slug,
          velikost: i.variant.velikost,
          mnozstvi: i.mnozstvi,
          cena: Number(i.cenaVDobeNakupu),
        })),
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
