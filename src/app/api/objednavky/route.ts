import { db } from '@/lib/db';
import { overitUzivatele } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { objednavkaSchema } from '@/lib/validations/objednavka';
import { vytvoritObjednavku } from '@/lib/objednavka';
import { FRONTY, publishJob } from '@/lib/queue';

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

    const vysledek = await vytvoritObjednavku(vstup, uzivatel?.id ?? null);

    if (!vysledek.ok) {
      return odpovedChyba(vysledek.chyba.zprava, vysledek.chyba.status, vysledek.chyba.pole);
    }

    // Fakturu i potvrzovací e-mail vyřídí worker – zákaznice nemá čekat,
    // až se vygeneruje PDF (sekce 3).
    await publishJob(FRONTY.VYGENEROVAT_FAKTURU, { orderId: vysledek.data.id });
    await publishJob(FRONTY.VYGENEROVAT_POUKAZY, { orderId: vysledek.data.id });
    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'potvrzeni-objednavky',
      to: vstup.email,
      subject: `Potvrzení objednávky ${vysledek.data.cisloObjednavky} – LINDA FASHION`,
      data: { orderId: vysledek.data.id, cisloObjednavky: vysledek.data.cisloObjednavky },
    });

    return odpovedOk(vysledek.data, 201);
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
        polozky: o.items.map((i) => ({
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
