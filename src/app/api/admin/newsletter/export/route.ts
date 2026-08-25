import { db } from '@/lib/db';
import { zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano, zapsatDoAuditu } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * Export potvrzených odběratelů novinek do CSV.
 *
 * E-shop souhlasy sbíral, ale seznam se nedal dostat ven – rozesílka v aplikaci
 * není a majitelka neměla jak adresy nahrát do nástroje, který ji umí. Sbírat
 * souhlas k něčemu, co se pak nedá použít, je tak trochu zpracování bez účelu.
 *
 * ## Jen potvrzené a jen neodhlášené
 *
 * Nepotvrzená adresa **není souhlas** (double opt-in, § 7 zák. č. 480/2004 Sb.)
 * a v exportu nemá co dělat – jinak by se rozeslalo na adresy, které to nikdy
 * neodsouhlasily, a export by se stal cestou, jak double opt-in obejít.
 * Odhlášené taky ne, z opačného konce téhož důvodu.
 *
 * Datum potvrzení je ve výpisu schválně: je to doklad souhlasu a patří k adrese,
 * ať se rozesílá odkudkoliv.
 */

/**
 * Uvozovky a jejich zdvojení podle RFC 4180.
 *
 * Sloupce se obalují **vždycky**, ne jen když obsahují oddělovač. Excel jinak
 * u některých hodnot hádá typ a e-mail nebo datum si přeformátuje po svém.
 */
function bunka(hodnota: string | null): string {
  return `"${(hodnota ?? '').replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const admin = await overitAdmina();
    if (!admin) return odpovedNeautorizovano();

    const odberatele = await db.newsletterSubscriber.findMany({
      where: { potvrzeno: true, odhlasenAt: null },
      orderBy: { potvrzenoAt: 'asc' },
      select: { email: true, potvrzenoAt: true, zdroj: true, createdAt: true },
    });

    const radky = [
      ['email', 'potvrzeno', 'zdroj', 'prihlaseno'].map(bunka).join(','),
      ...odberatele.map((o) =>
        [
          bunka(o.email),
          bunka(o.potvrzenoAt?.toISOString() ?? null),
          bunka(o.zdroj),
          bunka(o.createdAt.toISOString()),
        ].join(',')
      ),
    ];

    /*
     * BOM na začátku. Bez něj Excel na Windows CSV čte jako windows-1250
     * a z „Vánoční novinky" udělá „VÃ¡noÄ...". U e-mailů by to bylo jedno,
     * u zdroje a diakritiky ne.
     */
    const csv = `﻿${radky.join('\r\n')}\r\n`;

    // Export osobních údajů je úkon, který má být dohledatelný – kdo a kdy
    // seznam adres stáhl, patří do záznamů stejně jako změna produktu.
    await zapsatDoAuditu(admin.email, 'newsletter.export', 'NewsletterSubscriber', null, {
      pocet: odberatele.length,
    });

    const datum = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-${datum}.csv"`,
        // Seznam adres nepatří do žádné cache mezi serverem a prohlížečem.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
