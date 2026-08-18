/**
 * Evidence souhlasů (čl. 7 odst. 1 GDPR).
 *
 * „Pokud je zpracování založeno na souhlasu, musí být správce schopen doložit,
 * že subjekt údajů udělil souhlas se zpracováním svých osobních údajů."
 *
 * Do téhle chvíle e-shop doložit nedokázal nic. Souhlas s cookies žil výhradně
 * v `localStorage` prohlížeče — tedy u zákaznice, ne u správce, a smazáním
 * historie zmizel. Při kontrole ÚOOÚ je důkazní břemeno na prodávajícím
 * a „návštěvnice to měla zaškrtnuté" není důkaz.
 *
 * Dvě pravidla, na kterých ta evidence stojí:
 *
 *   1. **Záznamy jsou přírůstkové a neměnné.** Odvolání se zapisuje jako nový
 *      řádek s `udeleno = false`, nikdy se nepřepisuje ten původní. Kdyby se
 *      přepisoval, zmizelo by z evidence, že souhlas nějakou dobu platil —
 *      a právě to je při sporu o zákonnost dřívějšího zpracování ta podstatná
 *      informace.
 *
 *   2. **Zápis nikdy neshodí hlavní operaci.** Když se evidence nepovede
 *      uložit, objednávka ani odběr novinek kvůli tomu selhat nesmí. Stejná
 *      úvaha jako u `zapsatDoAuditu` — chybějící řádek se dá dohledat v logu,
 *      ztracená objednávka ne.
 */
import { db } from './db';
import type { Prisma, TypSouhlasu } from '@prisma/client';

/**
 * Verze textu zásad cookies.
 *
 * Zvedněte ji při každé věcné změně zásad. Bez toho evidence sice ukáže, že
 * návštěvnice souhlasila, ale ne s čím — a souhlas s textem, který v té době
 * neplatil, je stejně nepoužitelný jako žádný.
 */
export const VERZE_ZASAD_COOKIES = '2026-08-18';

export interface VstupSouhlasu {
  typ: TypSouhlasu;
  /** E-mail, nebo anonymní identifikátor návštěvnice u cookies. */
  subjekt: string;
  udeleno: boolean;
  podrobnosti?: Prisma.InputJsonValue;
  verze?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Zápis do evidence. Selhání se jen zaloguje, volajícího neshodí. */
export async function zaznamenatSouhlas(vstup: VstupSouhlasu): Promise<void> {
  try {
    await db.souhlasZaznam.create({
      data: {
        typ: vstup.typ,
        subjekt: vstup.subjekt,
        udeleno: vstup.udeleno,
        podrobnosti: vstup.podrobnosti,
        verze: vstup.verze ?? null,
        ip: vstup.ip ?? null,
        // Prohlížeče posílají i velmi dlouhé řetězce; sloupec je text, ale
        // do evidence nepatří kilobajt hlavičky.
        userAgent: vstup.userAgent?.slice(0, 400) ?? null,
      },
    });
  } catch (err) {
    console.error('[souhlas] Nepodařilo se zapsat záznam:', err);
  }
}

/**
 * Poslední známý stav souhlasu subjektu.
 *
 * Používá administrace, když potřebuje odpovědět na dotaz zákaznice „co u vás
 * o mně máte". Vrací `null`, když subjekt v evidenci vůbec není.
 */
export async function posledniSouhlas(subjekt: string, typ: TypSouhlasu) {
  return db.souhlasZaznam.findFirst({
    where: { subjekt, typ },
    orderBy: { createdAt: 'desc' },
  });
}

/** Celá historie souhlasů jednoho subjektu – podklad pro export podle čl. 20. */
export async function historieSouhlasu(subjekt: string) {
  return db.souhlasZaznam.findMany({
    where: { subjekt },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
}
