/**
 * Hlídání zásilek u Zásilkovny.
 *
 * Doplňuje `Order.datumDoruceni` samo, místo aby na něj majitelka musela
 * myslet. To není pohodlí: od převzetí zboží běží čtrnáctidenní lhůta pro
 * odstoupení (§ 1829 odst. 1) a `lzeOdstoupit()` v `lhuty.ts` z toho data
 * počítá. Dokud je prázdné, vrací pořád `true` – e-shop tedy nedokáže říct,
 * jestli je odstoupení včasné, a nikde se to neprojeví jako chyba.
 *
 * Ruční překlik na „Doručena" se vynechá skoro vždycky, protože se nic
 * nestane. Tahle úloha ten krok odebírá z hlavy.
 *
 * Bez aliasů `@/` – soubor se kompiluje do buildu workeru.
 */
import { db } from '../../lib/db';
import { FRONTY, publishJob } from '../../lib/queue';
import { jeDoruceno, jeNastaveno, stavZasilky } from '../../lib/packeta-api';

/**
 * Kolik objednávek se projde v jednom běhu.
 *
 * Každá je jedno volání na Zásilkovnu, takže strop drží dobu běhu i zátěž
 * jejich API v rozumných mezích. Nedojde-li se na konec, zbytek se vyřeší
 * za hodinu – zásilka nikam neuteče.
 */
const STROP = 100;

export async function hlidaniZasilekUloha(): Promise<void> {
  if (!jeNastaveno()) return;

  const objednavky = await db.order.findMany({
    where: {
      stav: 'EXPEDOVANA',
      zpusobDopravy: 'zasilkovna',
      // Prázdný řetězec je rozdělaná rezervace při zakládání zásilky.
      cisloZasilky: { not: null },
      datumDoruceni: null,
    },
    select: {
      id: true,
      cisloObjednavky: true,
      verejnyToken: true,
      cisloZasilky: true,
      email: true,
      user: { select: { email: true } },
    },
    take: STROP,
  });

  let doruceno = 0;

  for (const objednavka of objednavky) {
    const cislo = objednavka.cisloZasilky?.trim();
    if (!cislo) continue;

    try {
      const stav = await stavZasilky(cislo);
      if (!jeDoruceno(stav.kod)) continue;

      /*
       * Podmínka je součástí UPDATE a `datumDoruceni` se zapisuje jen do
       * prázdného sloupce. Přepsat ho při dalším průchodu by lhůtu pro
       * odstoupení posunulo dopředu a žádost podaná poslední den by se
       * najednou počítala od nového data – tedy v neprospěch zákaznice.
       */
      const zmeneno = await db.order.updateMany({
        where: { id: objednavka.id, stav: 'EXPEDOVANA', datumDoruceni: null },
        data: { stav: 'DORUCENA', datumDoruceni: new Date() },
      });

      if (zmeneno.count !== 1) continue;

      doruceno += 1;

      const kontakt = objednavka.email ?? objednavka.user?.email ?? null;

      if (kontakt) {
        await publishJob(FRONTY.ODESLAT_EMAIL, {
          typ: 'zmena-stavu-objednavky',
          to: kontakt,
          subject: `Objednávka ${objednavka.cisloObjednavky} – změna stavu`,
          data: {
            cisloObjednavky: objednavka.cisloObjednavky,
            verejnyToken: objednavka.verejnyToken,
            stav: 'DORUCENA',
            cisloZasilky: cislo,
          },
        });
      }
    } catch (err) {
      /*
       * Chyba u jedné zásilky nesmí shodit celou dávku – zbytek objednávek
       * by se pak nezkontroloval vůbec a jedna neznámá zásilka by blokovala
       * lhůty všem ostatním.
       */
      console.error(`[zásilky] ${objednavka.cisloObjednavky} (${cislo}) se nepodařilo ověřit:`, err);
    }
  }

  if (doruceno > 0) {
    console.log(`[zásilky] Označeno jako doručené: ${doruceno}.`);
  }
}
