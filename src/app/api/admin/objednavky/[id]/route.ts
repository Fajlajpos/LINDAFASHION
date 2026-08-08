import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';
import { FRONTY, publishJob } from '@/lib/queue';

export const dynamic = 'force-dynamic';

const STAVY = ['NOVA', 'ZPRACOVAVA_SE', 'EXPEDOVANA', 'DORUCENA', 'ZRUSENA', 'VRACENA'] as const;

const schema = z.object({
  stav: z.enum(STAVY).optional(),
  stavPlatby: z.enum(['CEKA_NA_PLATBU', 'ZAPLACENO', 'VRACENO']).optional(),
  cisloZasilky: z
    .string()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

/**
 * PATCH /api/admin/objednavky/[id] – změna stavu, platby a sledovacího čísla
 * (sekce 6.4 zadání).
 *
 * Zrušení objednávky vrací zboží na sklad, do limitu slevového kódu i na
 * dárkový poukaz – jinak by storno trvale ukrojilo z obojího.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const vstup = schema.parse(await request.json());

    const objednavka = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true, user: { select: { email: true } } },
    });

    if (!objednavka) return odpovedChyba('Objednávka nebyla nalezena.', 404);

    const rusi = vstup.stav === 'ZRUSENA' && objednavka.stav !== 'ZRUSENA';
    const obnovujeZeZruseni = objednavka.stav === 'ZRUSENA' && vstup.stav && vstup.stav !== 'ZRUSENA';

    if (obnovujeZeZruseni) {
      return odpovedChyba(
        'Zrušenou objednávku nelze vrátit zpět – zboží se už vrátilo do nabídky. Založte prosím novou objednávku.',
        409
      );
    }

    const zpracovano = await db.$transaction(async (tx) => {
      /*
       * Když se ruší, je podmínka na dosavadní stav součástí UPDATE. Dvojklik
       * jinak spustil vracení dvakrát: zboží se vrátilo na sklad dvojnásobně
       * a dvakrát se připsal i zůstatek dárkového poukazu.
       */
      const zmeneno = await tx.order.updateMany({
        where: rusi ? { id: params.id, stav: objednavka.stav } : { id: params.id },
        data: {
          ...(vstup.stav ? { stav: vstup.stav } : {}),
          ...(vstup.stavPlatby ? { stavPlatby: vstup.stavPlatby } : {}),
          ...(vstup.cisloZasilky !== undefined ? { cisloZasilky: vstup.cisloZasilky } : {}),
          // Z pole `zrusil` je pak v adminu vidět, kdo objednávku zrušil (sekce 6.4).
          ...(rusi ? { zrusil: 'ADMIN' as const } : {}),
        },
      });

      if (zmeneno.count !== 1) return false;

      if (rusi) {
        for (const polozka of objednavka.items) {
          await tx.productVariant.update({
            where: { id: polozka.variantId },
            data: { skladem: { increment: polozka.mnozstvi } },
          });
        }

        if (objednavka.discountCodeId) {
          await tx.discountCode.update({
            where: { id: objednavka.discountCodeId },
            data: { pocetPouziti: { decrement: 1 } },
          });
        }

        if (objednavka.giftCardId && objednavka.castkaZGiftCard) {
          await tx.giftCard.update({
            where: { id: objednavka.giftCardId },
            data: { zustatek: { increment: objednavka.castkaZGiftCard }, aktivni: true },
          });
        }
      }

      return true;
    });

    if (!zpracovano) {
      return odpovedChyba('Stav objednávky se mezitím změnil. Načtěte prosím stránku znovu.', 409);
    }

    // Zákaznici dáme vědět o změně stavu (sekce 6.4). Bez SMTP se zpráva
    // zatím jen zaloguje.
    //
    // `objednavka.email` je první v pořadí – objednávka bez registrace nemá
    // `user`, takže jí do téhle chvíle žádná zpráva o stavu nechodila vůbec.
    const kontakt = objednavka.email ?? objednavka.user?.email ?? null;

    if (vstup.stav && kontakt) {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'zmena-stavu-objednavky',
        to: kontakt,
        subject: `Objednávka ${objednavka.cisloObjednavky} – změna stavu`,
        data: { cisloObjednavky: objednavka.cisloObjednavky, stav: vstup.stav, cisloZasilky: vstup.cisloZasilky },
      });
    }

    // Faktura se generuje, až když je zaplaceno – dřív by nesouhlasila.
    if (vstup.stavPlatby === 'ZAPLACENO') {
      await publishJob(FRONTY.VYGENEROVAT_POUKAZY, { orderId: params.id });
    }

    await zapsatDoAuditu(admin.email, 'objednavka.upravena', 'Order', params.id, {
      nazev: objednavka.cisloObjednavky,
      stav: vstup.stav,
      stavPlatby: vstup.stavPlatby,
    });

    return odpovedOk({ upraveno: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
