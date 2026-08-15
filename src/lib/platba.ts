/**
 * Vyhodnocení online platby a překlopení objednávky na „zaplaceno".
 *
 * Sdílí ho notifikace od brány i návratová adresa – obojí vede na tentýž
 * postup a obojí může dorazit vícekrát (brána notifikaci opakuje, zákaznice
 * si stránku načte znovu). Proto je celý průchod **idempotentní**.
 */
import { db } from './db';
import { czkNaHalere, halereNaCzk } from './penize';
import { FRONTY, publishJob } from './queue';
import { jeUhrazeno, zjistitStavPlatby, type StavPlatby } from './gopay';

export type VysledekPlatby =
  | { stav: 'zaplaceno'; orderId: string; cisloObjednavky: string; verejnyToken: string; jizDrive: boolean }
  | { stav: 'ceka'; orderId: string; verejnyToken: string; stavBrany: StavPlatby }
  | { stav: 'neuspech'; orderId: string; verejnyToken: string; stavBrany: StavPlatby }
  | { stav: 'neznama' };

/**
 * Doptá se brány na stav platby a podle něj upraví objednávku.
 *
 * Vrací dost informací na to, aby návratová stránka věděla, kam zákaznici
 * poslat, a notifikace jen zahodila výsledek.
 */
export async function vyhodnotitPlatbu(platbaId: string): Promise<VysledekPlatby> {
  const objednavka = await db.order.findUnique({
    where: { platbaId },
    select: {
      id: true,
      cisloObjednavky: true,
      verejnyToken: true,
      email: true,
      stavPlatby: true,
      celkovaCena: true,
      castkaZGiftCard: true,
    },
  });

  // Neznámé id platby se schválně nekomentuje blíž – odpověď by potvrzovala,
  // která id u nás existují.
  if (!objednavka) return { stav: 'neznama' };

  const stavBrany = await zjistitStavPlatby(platbaId);

  if (!jeUhrazeno(stavBrany.stav)) {
    // Zrušená nebo propadlá platba objednávku neruší: zboží je odečtené ze
    // skladu a zákaznice může zaplatit znovu. Rušení je rozhodnutí majitelky
    // (nebo zákaznice přes storno), ne důsledek zavřeného okna brány.
    const neuspesne: StavPlatby[] = ['CANCELED', 'TIMEOUTED'];

    return {
      stav: neuspesne.includes(stavBrany.stav) ? 'neuspech' : 'ceka',
      orderId: objednavka.id,
      verejnyToken: objednavka.verejnyToken,
      stavBrany: stavBrany.stav,
    };
  }

  /*
   * Kontrola částky.
   *
   * Bez ní by stačilo, aby brána (nebo chyba v našem výpočtu) potvrdila
   * jinou sumu, a objednávka by se označila za uhrazenou s mankem. Porovnává
   * se to, co zbývalo doplatit po odečtení dárkového poukazu – právě tuhle
   * částku posílá `zalozitPlatbu`.
   */
  const kUhrade =
    czkNaHalere(objednavka.celkovaCena) -
    (objednavka.castkaZGiftCard === null ? 0 : czkNaHalere(objednavka.castkaZGiftCard));

  if (stavBrany.castka !== kUhrade) {
    console.error(
      `[platba] Objednávka ${objednavka.cisloObjednavky}: brána hlásí ${halereNaCzk(
        stavBrany.castka
      )} Kč, očekáváno ${halereNaCzk(kUhrade)} Kč. Platba se neoznačuje, řeší se ručně.`
    );

    return {
      stav: 'ceka',
      orderId: objednavka.id,
      verejnyToken: objednavka.verejnyToken,
      stavBrany: stavBrany.stav,
    };
  }

  /*
   * Podmínka na dosavadní stav je součástí UPDATE, ne kontroly před ním.
   *
   * Notifikaci brána opakuje a zákaznice si návratovou stránku načte znovu –
   * obojí umí dorazit současně. Bez podmínky uvnitř zápisu by oba průchody
   * prošly kontrolou „ještě není zaplaceno" a každý zařadil vlastní úlohu na
   * vygenerování dárkových poukazů. Zákaznice by dostala kódy dvakrát, a to
   * jsou peníze.
   */
  const zmeneno = await db.order.updateMany({
    where: { id: objednavka.id, stavPlatby: { not: 'ZAPLACENO' } },
    data: { stavPlatby: 'ZAPLACENO' },
  });

  if (zmeneno.count !== 1) {
    return {
      stav: 'zaplaceno',
      orderId: objednavka.id,
      cisloObjednavky: objednavka.cisloObjednavky,
      verejnyToken: objednavka.verejnyToken,
      jizDrive: true,
    };
  }

  // Doklad se přepíše (první verze vznikla jako podklad k platbě), poukazy se
  // vygenerují a zákaznici přijde potvrzení. Stejné pořadí jako v adminu.
  await publishJob(FRONTY.VYGENEROVAT_FAKTURU, { orderId: objednavka.id });
  await publishJob(FRONTY.VYGENEROVAT_POUKAZY, { orderId: objednavka.id });

  if (objednavka.email) {
    await publishJob(FRONTY.ODESLAT_EMAIL, {
      typ: 'platba-prijata',
      to: objednavka.email,
      subject: `Platba k objednávce ${objednavka.cisloObjednavky} přijata – LINDA FASHION`,
      data: { cisloObjednavky: objednavka.cisloObjednavky },
    });
  }

  console.log(`[platba] Objednávka ${objednavka.cisloObjednavky} je zaplacená.`);

  return {
    stav: 'zaplaceno',
    orderId: objednavka.id,
    cisloObjednavky: objednavka.cisloObjednavky,
    verejnyToken: objednavka.verejnyToken,
    jizDrive: false,
  };
}
