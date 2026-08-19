import { z } from 'zod';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { najitObjednavkuKlicem, type VerejnyKlic } from '@/lib/odstoupeni';

export const dynamic = 'force-dynamic';

/**
 * Načtení objednávky pro reklamační formulář **bez přihlášení**.
 *
 * Proč to nejde přes `/api/odstoupeni`: ten endpoint odmítne objednávku,
 * u které už uplynula čtrnáctidenní lhůta pro odstoupení nebo už odstoupení
 * běží. U reklamace vady je ale obojí irelevantní – práva z vadného plnění
 * trvají dva roky a s odstoupením nemají nic společného. Sdílet jeden
 * endpoint by znamenalo, že zákaznice s vadným švem po třech měsících dostane
 * hlášku „lhůta vypršela", což je věcně nesprávná odpověď na jinou otázku.
 *
 * Sdílená zůstává **autorizace** (`najitObjednavkuKlicem`), a to je ta část,
 * která se rozejít nesmí.
 */

const klicSchema = z
  .object({
    token: z.string().min(10).max(200).optional(),
    cisloObjednavky: z.string().max(40).optional(),
    email: z.string().max(200).optional(),
  })
  .refine((d) => !!d.token || (!!d.cisloObjednavky && !!d.email), {
    message: 'Zadejte číslo objednávky i e-mail.',
  });

/** Stavy, ve kterých zboží u zákaznice ještě není. */
const PRED_DORUCENIM = ['NOVA', 'ZPRACOVAVA_SE'];
const UZAVRENE = ['ZRUSENA', 'VRACENA'];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    /* Stejně přísný limit jako u odstoupení: dvojice číslo + e-mail se dá
       zkoušet hrubou silou a čísla objednávek jdou po sobě. */
    const limit = zkontrolovatLimit(`reklamace-hledani:${klientskaIp(request)}`, 20, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const vstup = klicSchema.parse({
      token: url.searchParams.get('token') ?? undefined,
      cisloObjednavky: url.searchParams.get('cisloObjednavky') ?? undefined,
      email: url.searchParams.get('email') ?? undefined,
    });

    const klic: VerejnyKlic = vstup.token
      ? { token: vstup.token }
      : {
          cisloObjednavky: (vstup.cisloObjednavky as string).trim(),
          email: (vstup.email as string).trim().toLowerCase(),
        };

    const objednavka = await najitObjednavkuKlicem(klic);

    /*
     * „Nenašli jsme" je jedna odpověď pro neexistující objednávku i pro
     * špatný e-mail. Rozlišit je by z endpointu udělalo nástroj na zjišťování,
     * která čísla objednávek existují.
     */
    if (!objednavka) {
      return odpovedOk({
        nalezeno: false,
        zprava:
          'Objednávku jsme podle zadaných údajů nenašli. Zkontrolujte prosím číslo objednávky a e-mail, který jste u ní použila.',
      });
    }

    if (UZAVRENE.includes(objednavka.stav)) {
      return odpovedOk({
        nalezeno: false,
        zprava:
          'Tahle objednávka je zrušená nebo vrácená. Napište nám prosím a domluvíme se, co s tím.',
      });
    }

    if (PRED_DORUCENIM.includes(objednavka.stav)) {
      return odpovedOk({
        nalezeno: false,
        zprava:
          'Objednávka k vám ještě nedorazila, takže není co reklamovat. Jakmile ji převezmete, formulář bude fungovat.',
      });
    }

    return odpovedOk({
      nalezeno: true,
      objednavka: {
        cisloObjednavky: objednavka.cisloObjednavky,
        token: objednavka.verejnyToken,
        datumObjednani: objednavka.createdAt,
        datumDoruceni: objednavka.datumDoruceni,
        polozky: objednavka.polozky,
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
