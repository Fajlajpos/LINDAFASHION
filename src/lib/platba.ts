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
   *
   * `stav` je v podmínce ze stejného důvodu, jen z druhé strany. Zrušená
   * objednávka má zboží dávno zpátky na skladě; kdyby ji notifikace přesto
   * označila za zaplacenou, přegeneroval by se doklad a vygenerovaly poukazy
   * k nákupu, který neplatí. Dá se to trefit úplně obyčejně: zákaznice nechá
   * otevřenou bránu, ve vedlejší záložce objednávku stornuje a platbu pak
   * dokončí. Totéž platí pro `VRACENA` a pro objednávku, kterou majitelka
   * ručně přepnula na vrácenou platbu – i tu by pozdní notifikace vrátila
   * zpátky na „zaplaceno".
   */
  const zmeneno = await db.order.updateMany({
    where: {
      id: objednavka.id,
      stavPlatby: { not: 'ZAPLACENO' },
      stav: { notIn: ['ZRUSENA', 'VRACENA'] },
    },
    data: { stavPlatby: 'ZAPLACENO' },
  });

  if (zmeneno.count !== 1) {
    /*
     * Zápis neprošel ze dvou různých důvodů a **nesmí se slít do jednoho**.
     * Když je objednávka zrušená, ohlásit ji jako dávno uhrazenou by zakrylo
     * přesně ten případ, kvůli kterému je `stav` v podmínce. Dočtení řádku
     * je jeden dotaz navíc jen na téhle vzácné větvi.
     */
    const ted = await db.order.findUnique({
      where: { id: objednavka.id },
      select: { stav: true, stavPlatby: true },
    });

    if (ted && ted.stavPlatby !== 'ZAPLACENO') {
      /*
       * Peníze reálně přišly, ale objednávka neplatí. Nezamlčet a nezaúčtovat:
       * patří to majitelce k ručnímu vyřízení (vrácení platby), stejně jako
       * nesouhlas částky o pár řádků výš. Tichý souhlas by tu znamenal, že si
       * e-shop nechal peníze za zrušený nákup.
       */
      console.error(
        `[platba] Objednávka ${objednavka.cisloObjednavky}: brána hlásí uhrazeno, ale objednávka je ve stavu ${ted.stav}. ` +
          'Platba se neoznačuje – vratku je potřeba vyřídit ručně.'
      );

      return {
        stav: 'ceka',
        orderId: objednavka.id,
        verejnyToken: objednavka.verejnyToken,
        stavBrany: stavBrany.stav,
      };
    }

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
      // Token je tu proto, aby odkaz v e-mailu fungoval i objednávce bez
      // registrace – ta na `/muj-ucet` nikdy nedohlédne.
      data: {
        cisloObjednavky: objednavka.cisloObjednavky,
        verejnyToken: objednavka.verejnyToken,
      },
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
