import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { odpovedChyba, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Doklad k objednávce v PDF.
 *
 * Faktury leží ve `storage/faktury/`, mimo `public/` – obsahují jméno, adresu
 * i nákup, takže je nesmí dostat kdokoli, kdo uhodne název souboru. Do téhle
 * chvíle je ale nedostal vůbec nikdo: worker PDF vygeneroval a nic ho neservírovalo.
 *
 * Autorizuje `verejnyToken` objednávky – náhodný klíč, který zná jen ta, kdo
 * objednávku dokončila (a administrace). Přihlášení se nevyžaduje, protože
 * nakupovat lze bez registrace.
 */

/** Číslo objednávky má tvar `2026-00042`; jiné do názvu souboru nepustíme. */
const CISLO_OBJEDNAVKY = /^\d{4}-\d{5,}$/;

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    // Token je náhodný, ale hádat ho hrubou silou nemá být zadarmo.
    const limit = zkontrolovatLimit(`faktura:${klientskaIp(_request)}`, 60, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho požadavků. Zkuste to prosím za chvíli.', 429);
    }

    const token = params.token?.trim();
    if (!token) return odpovedChyba('Doklad nenalezen.', 404);

    const objednavka = await db.order.findUnique({
      where: { verejnyToken: token },
      select: { cisloObjednavky: true },
    });

    // Neexistující objednávka i neexistující soubor vracejí totéž – ať se
    // z odpovědi nedá vyčíst, které tokeny jsou platné.
    if (!objednavka || !CISLO_OBJEDNAVKY.test(objednavka.cisloObjednavky)) {
      return odpovedChyba('Doklad nenalezen.', 404);
    }

    const soubor = path.join(process.cwd(), 'storage', 'faktury', `${objednavka.cisloObjednavky}.pdf`);

    let pdf: Buffer;
    try {
      pdf = await fs.readFile(soubor);
    } catch {
      // Worker doklad ještě nevygeneroval, nebo se úloha nepovedla.
      return odpovedChyba(
        'Doklad se ještě připravuje. Zkuste to prosím za chvíli, nebo se nám ozvěte.',
        404
      );
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdf.length),
        'Content-Disposition': `inline; filename="doklad-${objednavka.cisloObjednavky}.pdf"`,
        // Doklad obsahuje osobní údaje – nesmí zůstat v žádné sdílené cache.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
