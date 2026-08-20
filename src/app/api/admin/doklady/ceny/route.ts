import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano } from '@/lib/admin';
import { halereNaCzk } from '@/lib/penize';
import { DNU_OKNA, nejnizsiCenaVOkne, zacatekOkna } from '@/lib/cenova-historie';

export const dynamic = 'force-dynamic';

/**
 * Podklad k ceně jednoho produktu — § 12a zák. č. 634/1992 Sb.
 *
 * Tohle je odpověď na dopis od ČOI: „doložte, za kolik jste zboží nabízeli
 * v době 30 dnů před vyhlášením slevy." Data v `PriceHistory` byla vždycky,
 * ale číst se dala jenom SQL dotazem — tedy prakticky nikdy, protože
 * majitelka SQL nepíše a lhůta od úřadu běží i o víkendu.
 *
 * Endpoint **jen čte**. Cenová evidence je důkaz; kdyby šla přes API měnit,
 * ztratila by smysl. Zápis dělá výhradně `zapsatCenu()` při změně ceny.
 *
 * `kDatu` je tu schválně: kontrola se ptá na **minulost**, ne na dnešek.
 * Bez něj by šlo doložit jen aktuální stav, což je odpověď na otázku, kterou
 * nikdo nepoložil.
 */

const dotazSchema = z.object({
  productId: z.string().min(1, 'Vyberte produkt.'),
  kDatu: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : new Date()))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Neplatné datum.' }),
});

export async function GET(request: Request) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    const url = new URL(request.url);

    const vstup = dotazSchema.parse({
      productId: url.searchParams.get('productId') ?? '',
      kDatu: url.searchParams.get('kDatu') ?? undefined,
    });

    const produkt = await db.product.findUnique({
      where: { id: vstup.productId },
      select: {
        id: true,
        nazev: true,
        sku: true,
        cena: true,
        cenaPoSleve: true,
        slevaOd: true,
        nejnizsiCena30DniHaleru: true,
      },
    });

    if (!produkt) return odpovedChyba('Produkt nebyl nalezen.', 404);

    /*
     * Celá evidence, ne jen okno. Kontrola se často ptá na starší období
     * a doklad, který končí třicet dnů zpátky, jí neodpoví. Řadí se vzestupně,
     * aby se dal číst jako časová osa.
     */
    const zaznamy = await db.priceHistory.findMany({
      where: { productId: produkt.id },
      orderBy: { platnaOd: 'asc' },
      select: {
        id: true,
        cenaHaleru: true,
        zakladniCenaHaleru: true,
        jeSleva: true,
        platnaOd: true,
        zdroj: true,
      },
    });

    const referencni = await nejnizsiCenaVOkne(db, produkt.id, vstup.kDatu);

    return odpovedOk({
      produkt: {
        id: produkt.id,
        nazev: produkt.nazev,
        sku: produkt.sku,
        cena: Number(produkt.cena),
        cenaPoSleve: produkt.cenaPoSleve === null ? null : Number(produkt.cenaPoSleve),
        slevaOd: produkt.slevaOd,
        /*
         * Zmrazená referenční cena z okamžiku vyhlášení slevy. Právě tahle
         * hodnota se ukazuje zákaznici na webu, takže právě ji bude chtít
         * kontrola vidět doloženou.
         */
        nejnizsiCena30Dni:
          produkt.nejnizsiCena30DniHaleru === null
            ? null
            : halereNaCzk(produkt.nejnizsiCena30DniHaleru),
      },
      okno: {
        kDatu: vstup.kDatu,
        zacatek: zacatekOkna(vstup.kDatu),
        dnu: DNU_OKNA,
        // Dopočet k zadanému dni – kontrola si tak může ověřit i minulou akci.
        nejnizsiCena: referencni === null ? null : halereNaCzk(referencni),
      },
      zaznamy: zaznamy.map((z) => ({
        id: z.id,
        cena: halereNaCzk(z.cenaHaleru),
        zakladniCena: halereNaCzk(z.zakladniCenaHaleru),
        jeSleva: z.jeSleva,
        platnaOd: z.platnaOd,
        zdroj: z.zdroj,
      })),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
