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
import { FRONTY, publishJob } from '../../lib/queue';

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

  /*
   * A jen k objednávce, která pořád platí.
   *
   * Zaplaceno samo o sobě nestačí: kód na doručitele se dá utratit i po tom,
   * co se nákup zrušil, a zpátky ho nikdo nevezme. `platba.ts` už zrušenou
   * objednávku za zaplacenou označit nenechá, tohle je druhá vrstva – u
   * platidla se vyplatí, protože chyba tímhle směrem se nedá vzít zpět.
   */
  if (objednavka.stav === 'ZRUSENA' || objednavka.stav === 'VRACENA') {
    console.warn(
      `[poukazy] Objednávka ${objednavka.cisloObjednavky} je ve stavu ${objednavka.stav} – poukazy se nevydávají.`
    );
    return;
  }

  /** Kódy vydané v tomhle běhu – posílají se zákaznici jedním e-mailem. */
  const noveKody: string[] = [];

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
          noveKody.push(kod);
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

  /*
   * --- Kód se musí dostat k zákaznici ---
   *
   * Do téhle chvíle úloha poukaz založila v databázi a tím to skončilo:
   * administrace kódy nevypisovala a e-mail neexistoval. Zákaznice zaplatila
   * za poukaz, který nikdy neviděla, a majitelka ho neměla kde opsat.
   *
   * Posílají se jen kódy vydané **v tomhle běhu**. Úloha je záměrně
   * idempotentní (`chybi` počítá, co ještě chybí), takže opakované označení
   * objednávky jako zaplacené sem podruhé nedojde a zákaznici nepřijde
   * tentýž kód dvakrát.
   *
   * Selhání zařazení do fronty nesmí shodit celou úlohu – poukazy už v
   * databázi jsou a druhý běh by je nevydal znovu, takže by je opakování
   * jen zbytečně hledalo. Kódy se proto v takovém případě zaloguje.
   */
  if (noveKody.length > 0) {
    const kontakt = objednavka.email ?? null;

    if (!kontakt) {
      console.warn(
        `[poukazy] Objednávka ${objednavka.cisloObjednavky} nemá kontaktní e-mail. Kódy: ${noveKody.join(', ')}`
      );
      return;
    }

    try {
      await publishJob(FRONTY.ODESLAT_EMAIL, {
        typ: 'poukazy-vydane',
        to: kontakt,
        subject:
          noveKody.length === 1
            ? 'Váš dárkový poukaz – LINDA FASHION'
            : `Vaše dárkové poukazy (${noveKody.length}×) – LINDA FASHION`,
        data: { cisloObjednavky: objednavka.cisloObjednavky, kody: noveKody },
      });
    } catch (err) {
      console.error(
        `[poukazy] Nepodařilo se zařadit e-mail s kódy pro ${objednavka.cisloObjednavky}. Kódy: ${noveKody.join(', ')}`,
        err
      );
    }
  }
}
