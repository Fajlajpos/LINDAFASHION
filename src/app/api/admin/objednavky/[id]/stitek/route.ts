import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { odpovedChyba, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano } from '@/lib/admin';
import { ChybaPackety, jeNastaveno, stitekPdf } from '@/lib/packeta-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/objednavky/[id]/stitek – štítek k zásilce v PDF.
 *
 * Proudí rovnou od Zásilkovny a **na disk se neukládá**. Faktury se ukládají
 * proto, že jsou účetní doklad, který musí jít vydat i za pět let; štítek je
 * jednorázový tisk, který by se jinak musel uklízet a zálohovat.
 *
 * Autorizuje přihlášení do administrace, ne `verejnyToken` jako u faktury –
 * štítek nemá zákaznice k čemu potřebovat a je na něm i adresa odesílatele.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    if (!jeNastaveno()) {
      return odpovedChyba('Zásilkovna není nastavená.', 503);
    }

    const objednavka = await db.order.findUnique({
      where: { id: params.id },
      select: { cisloObjednavky: true, cisloZasilky: true, zpusobDopravy: true },
    });

    if (!objednavka) return odpovedChyba('Objednávka nebyla nalezena.', 404);

    /*
     * Prázdný řetězec je rozdělaná rezervace z `POST …/zasilka`, ne číslo
     * zásilky. Bez téhle podmínky by se během zakládání sáhlo na Zásilkovnu
     * s prázdným `packetId`.
     */
    if (objednavka.zpusobDopravy !== 'zasilkovna' || !objednavka.cisloZasilky?.trim()) {
      return odpovedChyba('K téhle objednávce zatím není zásilka.', 404);
    }

    let pdf: Buffer;
    try {
      pdf = await stitekPdf(objednavka.cisloZasilky);
    } catch (err) {
      if (err instanceof ChybaPackety) {
        return odpovedChyba(err.detail ? `${err.message} ${err.detail}` : err.message, 502);
      }
      throw err;
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdf.length),
        'Content-Disposition': `inline; filename="stitek-${objednavka.cisloObjednavky}.pdf"`,
        // Je na něm jméno a adresa zákaznice – nesmí zůstat ve sdílené cache.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
