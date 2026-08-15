import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { jeNastaveno } from '@/lib/gopay';
import { vyhodnotitPlatbu } from '@/lib/platba';

export const dynamic = 'force-dynamic';

function zaklad(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Návrat zákaznice z platební brány.
 *
 * GoPay sem po zaplacení (i po zrušení) přesměruje prohlížeč s parametrem
 * `id`. Stránka jen přesměruje dál na potvrzení objednávky – po cestě se ale
 * zkusí stav doptat u brány, aby zákaznice viděla „zaplaceno" hned a nemusela
 * čekat, až dorazí notifikace server–server.
 *
 * **Ta notifikace je pořád ta hlavní cesta.** Návrat závisí na tom, že
 * zákaznice okno nezavřela a že prohlížeč přesměrování dokončil; ani jedno
 * nelze spoléhat. Tenhle handler je proto jen urychlení, ne jediné místo,
 * kde se platba uzavírá.
 *
 * Že je zaplaceno, se **nebere z parametrů v URL** – ty si umí přepsat každý.
 * Rozhoduje odpověď brány.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const platbaId = url.searchParams.get('id')?.trim();
    const token = url.searchParams.get('t')?.trim();

    // Kam se vrátit, když se nedá zjistit nic dalšího.
    const nouzovyCil = token
      ? `${zaklad()}/pokladna/potvrzeni?t=${encodeURIComponent(token)}`
      : `${zaklad()}/muj-ucet`;

    if (!platbaId || !jeNastaveno()) {
      return NextResponse.redirect(nouzovyCil, { status: 303 });
    }

    const limit = zkontrolovatLimit(`gopay-navrat:${klientskaIp(request)}`, 60, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return NextResponse.redirect(nouzovyCil, { status: 303 });
    }

    /*
     * Token se přednostně bere z databáze podle id platby, ne z adresy.
     * `t=` v URL si umí kdokoliv přepsat; kdyby se použil bez kontroly,
     * skončila by zákaznice po platbě na cizí objednávce – tedy na cizím
     * jméně, adrese a nákupu.
     */
    let cilovyToken: string | null = null;

    try {
      const vysledek = await vyhodnotitPlatbu(platbaId);
      if (vysledek.stav !== 'neznama') cilovyToken = vysledek.verejnyToken;
    } catch (err) {
      /*
       * Výpadek brány nesmí zákaznici nechat na chybové stránce – objednávka
       * je založená a platba nejspíš proběhla. Pošleme ji na potvrzení;
       * o zbytek se postará notifikace, až brána naběhne.
       */
      console.error('[gopay] Návrat: stav platby se nepodařilo ověřit:', err);
    }

    // Záloha pro případ, že se stav nepodařilo zjistit: token z adresy se
    // použije, jen když opravdu patří existující objednávce.
    if (!cilovyToken && token) {
      const existuje = await db.order.findUnique({
        where: { verejnyToken: token },
        select: { id: true },
      });
      if (existuje) cilovyToken = token;
    }

    const cil = cilovyToken
      ? `${zaklad()}/pokladna/potvrzeni?t=${encodeURIComponent(cilovyToken)}`
      : `${zaklad()}/muj-ucet`;

    return NextResponse.redirect(cil, { status: 303, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
