/**
 * Úloha: vygenerování dárkových poukazů zakoupených jako zboží (sekce 6.11).
 *
 * Poukazy jsou fyzické karty – objednávají se jako běžný produkt. Po zaplacení
 * k nim systém vytvoří odpovídající `GiftCard` záznamy, které pak majitelka
 * vytiskne a přiloží k zásilce.
 *
 * Klíčové pravidlo ze zadání: objednala-li zákaznice víc kusů téže varianty,
 * vznikne **tolik samostatných poukazů s vlastními kódy**, kolik kusů koupila –
 * ne jeden společný kód.
 */
import { db } from '../../lib/db';
import { castkaZVarianty, vygenerovatKodPoukazu } from '../../lib/poukazy';

export interface UlohaPoukazy {
  orderId: string;
}

export async function vygenerovatPoukazyUloha(data: UlohaPoukazy): Promise<void> {
  const objednavka = await db.order.findUnique({
    where: { id: data.orderId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
          vygenerovanePoukazy: { select: { id: true } },
        },
      },
    },
  });

  if (!objednavka) return;

  // Poukaz je platidlo – vydáváme ho, teprve když jsou peníze na účtu.
  if (objednavka.stavPlatby !== 'ZAPLACENO') {
    return;
  }

  for (const polozka of objednavka.items) {
    if (!polozka.variant.product.jeDarkovyPoukaz) continue;

    // Úloha může doběhnout vícekrát (opakování ve frontě, opětovné označení
    // jako zaplacené) – co je vydané, znovu nevydáváme.
    const chybi = polozka.mnozstvi - polozka.vygenerovanePoukazy.length;
    if (chybi <= 0) continue;

    const castka = castkaZVarianty(polozka.variant.velikost);

    if (castka === null) {
      console.error(
        `[poukazy] Z varianty „${polozka.variant.velikost}" nejde vyčíst částka – poukaz nevydán.`
      );
      continue;
    }

    for (let i = 0; i < chybi; i++) {
      // Kolize kódu je krajně nepravděpodobná, ale unikátní index by ji
      // odmítl – proto pár pokusů.
      for (let pokus = 0; pokus < 5; pokus++) {
        const kod = vygenerovatKodPoukazu();

        try {
          await db.giftCard.create({
            data: {
              kod,
              castka,
              zustatek: castka,
              vytvorenoZObjednavkyId: polozka.id,
            },
          });
          break;
        } catch (err) {
          if (pokus === 4) throw err;
        }
      }
    }

    console.log(
      `[poukazy] Objednávka ${objednavka.cisloObjednavky}: vydáno ${chybi}× poukaz na ${castka} Kč.`
    );
  }
}
